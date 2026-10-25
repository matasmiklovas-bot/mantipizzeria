import type { NextRequest } from "next/server";

// Live tyre offers for public/autoservisai/naujospadangos. The shop has no API,
// so this reads its search page server-side (the browser can't: no CORS) and
// returns the same rows the page embeds as its offline snapshot.

const SHOP = "https://www.naujospadangosinternetu.lt/padangos.htm";
const SEASONS: Record<string, string> = { winter: "2", summer: "1", all: "3" };
const BRANDS = ["BF Goodrich", "Road Rider", "Ling Long", "GT Radial", "King Meiler", "Green Max", "Momo Tires", "Tri Ace", "Royal Black", "Double Star"];

const CORS = { "Access-Control-Allow-Origin": "*" };

type Row = [id: string, brand: string, model: string, idx: string, price: number, fuel: string, wet: string, noise: number | null, stock: number, days: string, img: string];

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

const SIZE_RE = /\b\d{3}\/\d{2}\s?Z?R\s?\d{2}(?:\.\d)?C?\b/gi;
const IDX_RE = /\b(\d{2,3}(?:\/\d{2,3})?)\s?([A-Z])\b/;
const JUNK_RE = /(?<!\S)(vasarinės|žieminės|universalios|dygliuotos|all-season|XL|FP|RF|MFS|M\+S|3PMSF)(?=\s|$)/gi;

function toRow(li: string): Row | null {
  const get = (re: RegExp) => li.match(re)?.[1] ?? null;
  const id = get(/name="addcart"\s+value="(\d+)"/);
  const rawTitle = get(/class="title">\s*<a[^>]*>([^<]+)/);
  const price = get(/class="price">\s*([\d.]+)/);
  if (!id || !rawTitle || !price) return null;
  const title = decode(rawTitle).trim();
  if (/RESTAURUOTA/i.test(title)) return null; // the shop promises new tyres only

  const brand = BRANDS.find((b) => title.toLowerCase().startsWith(b.toLowerCase() + " ")) ?? title.split(/\s+/)[0];
  const det = (get(/class="details">\s*([^<]+)/) ?? "").replace(/\s+/g, " ");
  const m = det.match(IDX_RE) ?? title.replace(SIZE_RE, " ").match(IDX_RE);
  const rest = title
    .slice(brand.length)
    .replace(/\(\s*\d{4}\s*\)|tik\s+\d+\s*vnt\.?|DOT\s?\d{2,4}|^\s*padangos\b|\(\s*[A-G](?:\s+[A-G]){1,2}\s+\d+\s*dB\s*\)/gi, " ")
    .replace(SIZE_RE, " ")
    .replace(new RegExp(IDX_RE.source, "g"), " ")
    .replace(JUNK_RE, " ");
  const model = rest
    .split(/\s+/)
    .filter((w) => w && w.toLowerCase() !== brand.toLowerCase())
    .map((w) => (/^[A-ZĄČĘĖĮŠŲŪŽ]{3,}$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ")
    .replace(/^[\s-]+|[\s-]+$/g, "");
  const noise = get(/class="noise"><i>(\d+)/);
  const days = (get(/<\/i>\s*([^<]*?d\.d\.?)\s*<\/span>/) ?? "").match(/\d+/g);

  return [
    id,
    brand,
    model || decode(get(/<img[^>]*alt="([^"]*)"/) ?? "").replace(SIZE_RE, "").trim(),
    m ? m[1] + m[2] : "",
    Number(price),
    grade(get(/class="fuel"><i>([^<]*)/)),
    grade(get(/class="rain"><i>([^<]*)/)),
    noise ? Number(noise) : null,
    Number(get(/Sandėlyje yra (\d+)/) ?? 0),
    days ? days.slice(0, 2).join("–") : "1–3",
    (get(/<img[^>]*src="([^"]+)"/) ?? "").replace(/^https?:\/\/www\.naujospadangosinternetu\.lt\//, ""),
  ];
}

const grade = (s: string | null) => (s?.trim().toUpperCase().match(/^[A-G]$/) ? s.trim().toUpperCase() : "");

const parse = (html: string) =>
  [...html.matchAll(/<li class="product clearfix">([\s\S]*?)<\/form>/g)].map((m) => toRow(m[1])).filter((r): r is Row => r !== null);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const w = q.get("w") ?? "", h = q.get("h") ?? "", r = q.get("r") ?? "", season = SEASONS[q.get("season") ?? ""];
  if (!/^\d{3}$/.test(w) || !/^\d{2}$/.test(h) || !/^\d{2}$/.test(r) || !season) {
    return Response.json({ error: "Bad size" }, { status: 400, headers: CORS });
  }

  try {
    const search = new URLSearchParams({ "filter[plotis]": w, "filter[aukstis]": h, "filter[diametras]": `R${r}`, "filter[sezonas]": season });
    const first = await fetch(`${SHOP}?${search}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const cheap = parse(await first.text());

    // The shop keeps filters in its session, so the premium (most expensive first)
    // listing must reuse the cookie from the first request.
    let premium: Row[] = [];
    const cookie = first.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    if (cheap.length >= 10 && cookie) {
      const res = await fetch(`${SHOP}?sort=1`, { cache: "no-store", headers: { cookie }, signal: AbortSignal.timeout(8000) });
      premium = parse(await res.text());
    }

    const seen = new Set<string>();
    const offers = [...cheap.slice(0, 12), ...premium.slice(0, 6)]
      .filter((row) => !seen.has(row[0]) && seen.add(row[0]))
      .sort((a, b) => a[4] - b[4]);

    return Response.json(
      { offers, updated: new Date().toISOString() },
      { headers: { ...CORS, "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch {
    return Response.json({ error: "Shop unavailable" }, { status: 502, headers: CORS });
  }
}
