/**
 * Finds companies in the public 1551.lt catalog and reads their contact data straight from the page,
 * so contacts are never made up. Used by "Rasti naujų" when no paid web search is available.
 */
import { REVENUE_BRACKETS, type LeadInput, type Need, type RevenueId } from "./types";

const ORIGIN = "https://www.1551.lt";
const UA = "Mozilla/5.0 (compatible; Coldai/1.0)";

export type Found = LeadInput & { revenueValue?: number; employees?: string; facebook?: boolean };

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .replace(/\s+/g, "+");

/** One catalog page; a page that hangs is dropped after 8 s instead of stalling the whole search. */
async function get(url: string, signal?: AbortSignal): Promise<string> {
  const limit = AbortSignal.timeout(8000);
  const r = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "lt" },
    signal: signal ? AbortSignal.any([signal, limit]) : limit,
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`1551 ${r.status}`);
  return r.text();
}

/** True when the company's town is the one asked for (1551.lt also returns nearby towns). */
export function inCity(c: Found, city: string) {
  if (!city) return true;
  const n = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  const want = n(city).slice(0, 4);
  return !!want && n(c.city).startsWith(want);
}

/** Words people type for "anything" / "all of Lithuania": these mean no filter. */
const ANY = /^(visk(as|a)|visi|visos|bet\s*k(as|ur|ą)|visur|vis[aą]\s*(lt|lietuv[aą])|lietuv[aą]|lt|visa|all|\*|-)$/;
export const anyValue = (v: string) => ANY.test(v.trim().toLowerCase());

export async function searchPage(keyword: string, city: string, page: number, signal?: AbortSignal): Promise<string[]> {
  const kw = slug(keyword) || "imones";
  // 1551.lt answers 403 to a space in the city; "vilniaus-r" redirects to the right place.
  const c = anyValue(city) ? "" : slug(city).replace(/\+/g, "-");
  const at = (cc: string) => `/paieska/${kw}/${cc ? `${encodeURIComponent(cc)}/` : ""}${page > 1 ? `${page}/` : ""}`;
  let html: string;
  try {
    html = await get(ORIGIN + at(c), signal);
  } catch (err) {
    // A city the catalog doesn't accept: search all of Lithuania instead of failing.
    if (!c || signal?.aborted) throw err;
    html = await get(ORIGIN + at(""), signal);
  }
  const out = new Set<string>();
  for (const m of html.matchAll(/class="tm-mcard-img" href="(\/[a-z0-9-]+-\d{3,}\/)"/g)) out.add(ORIGIN + m[1]);
  return [...out];
}

function fields(html: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const m of html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/g)) {
    const k = decode(m[1]).replace(/:$/, "").trim();
    if (k && !(k in f)) f[k] = decode(m[2]);
  }
  return f;
}

const parseRevenue = (s: string) => {
  const m = s.match(/^([\d\s]+)\s*€.*?\((\d{4}) m\.\)/);
  if (!m) return null;
  const v = Number(m[1].replace(/\s/g, ""));
  return v > 0 ? { text: `${m[1].trim()} € (${m[2]} m., 1551.lt)`, value: v } : null;
};

const phone = (s: string) => {
  const d = s.replace(/[^\d+]/g, "");
  const m = d.match(/^\+370(\d{3})(\d{5})$/);
  return m ? `+370 ${m[1]} ${m[2]}` : s;
};

export async function readCompany(url: string, signal?: AbortSignal): Promise<Found | null> {
  const html = await get(url, signal);
  const f = fields(html);
  const h1 = html.match(/<h1[^>]*>\s*<span itemprop="name">([\s\S]*?)<\/span>/);
  const full = h1 ? decode(h1[1]) : "";
  let [name, ...rest] = full.split(" - ");
  if (!name) return null;
  if (!rest.length && name.length > 45) {
    // "INES, I. Grigaliūnienės grožio salonas, kirpykla, …" -> name "INES", the rest is the description
    const parts = name.split(", ");
    const legal = /^(UAB|MB|IĮ|AB|VŠĮ|IVV|PĮ)$/i;
    const keep = legal.test(parts[1] ?? "") ? 2 : 1;
    rest = [parts.slice(keep).join(", ")];
    name = parts.slice(0, keep).join(", ");
  }
  const rev = f["Apyvarta"] ? parseRevenue(f["Apyvarta"]) : null;
  const site = f["Tinklalapis"] || f["Svetainės adresas internete"] || "";
  const addr = f["Adresas"] || "";
  const cityRaw = addr.split(",").map((x) => x.trim()).filter(Boolean).pop() || "";
  const city = cityRaw.replace(/^LT-\d+\s*/, "").split(" ")[0];
  return {
    name: name.trim().slice(0, 200),
    companyCode: (f["Kodas"] || "").slice(0, 40),
    category: rest.join(" - ").split(/,| ir /)[0].trim().slice(0, 120),
    city: city ? city.charAt(0) + city.slice(1).toLocaleLowerCase("lt") : "",
    phone: f["Telefonas"] ? phone(f["Telefonas"]) : "",
    email: (f["El. paštas"] || "").split(" ")[0].slice(0, 200),
    website: site ? (site.startsWith("http") ? site : `http://${site}`).slice(0, 300) : "",
    revenue: rev?.text ?? "",
    revenueValue: rev?.value,
    employees: (f["Darbuotojų skaičius"] || "").replace(/\s*-\s*/, "–"),
    need: "Svetainė",
    reason: "",
    source: url,
    facebook: /facebook\.com/.test(html.split("Papildoma informacija")[1] ?? html),
  };
}

const BRACKETS: Record<RevenueId, [number, number]> = {
  lt50k: [0, 50_000],
  "50-150k": [50_000, 150_000],
  "150-500k": [150_000, 500_000],
  "500k-1m": [500_000, 1_000_000],
  "1-5m": [1_000_000, 5_000_000],
  gt5m: [5_000_000, Infinity],
};

export function fitsRevenue(c: Found, ids: RevenueId[]) {
  // Nothing or every bracket ticked means "any revenue", including companies that don't publish it.
  if (!ids.length || ids.length >= REVENUE_BRACKETS.length) return true;
  if (!c.revenueValue) return false;
  return ids.some((id) => c.revenueValue! >= BRACKETS[id][0] && c.revenueValue! < BRACKETS[id][1]);
}

/** Pick what to offer and a plain reason from the catalog facts alone. */
export function ruleReason(c: Found, needs: Need[], phrase: string): { need: Need; reason: string } | null {
  const wantsUpdate = needs.length > 0 && needs.every((n) => n === "Svetainės atnaujinimas");
  if (c.website) {
    if (!wantsUpdate) return null;
    return { need: "Svetainės atnaujinimas", reason: `Turi svetainę (${c.website.replace(/^https?:\/\//, "")}). Prieš skambindamas patikrink, ar ji nepasenusi ir veikia telefone.` };
  }
  const need: Need = needs.find((n) => n !== "Svetainės atnaujinimas") ?? "Svetainė";
  return {
    need,
    reason: `1551.lt kataloge nenurodyta jokia svetainė${c.facebook ? ", tik Facebook" : ""}. Žmonės, kurie Google ieško „${phrase}“, jų neranda.`,
  };
}

export const revenueLabel = (ids: RevenueId[]) => REVENUE_BRACKETS.filter((r) => ids.includes(r.id)).map((r) => r.label).join(", ");
