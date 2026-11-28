import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import { aiClient, aiErrorMessage, modelId, modelKey, liteText, webSearch } from "@/lib/ai";
import { anyValue, fitsRevenue, readCompany, ruleReason, searchPage, type Found } from "@/lib/finder1551";
import { cleanLead } from "@/lib/api";
import { withoutDuplicates } from "@/lib/dedupe";
import { me, unauthorized } from "@/lib/session";
import { dbUrl, list, putMany } from "@/lib/store";
import { NEEDS, REVENUE_BRACKETS, type LeadInput, type SearchEvent, type SearchRequest } from "@/lib/types";

async function existingKeys(ws: string) {
  const { docs } = await list(ws, "leads");
  return docs.map((d) => ({ name: String(d.data.name ?? ""), phone: String(d.data.phone ?? ""), companyCode: String(d.data.companyCode ?? "") }));
}

async function insertLeads(ws: string, items: LeadInput[], author: string): Promise<number> {
  const now = Date.now();
  await putMany(
    ws,
    "leads",
    items.map((it, i) => {
      const id = `ai-${randomUUID().slice(0, 12)}`;
      return { id, data: { ...it, id, status: "new", attempts: 0, assignee: "", createdBy: author, createdAt: now - i, updatedAt: now, fresh: true } };
    }),
  );
  return items.length;
}

export const maxDuration = 300;

const MAX_ROUNDS = 6;

const DEFAULT_KEYWORDS = ["kirpykla", "autoservisas", "statybos darbai", "santechnikas", "kavine", "baldu gamyba", "grozio salonas", "valymo paslaugos", "elektrikas", "stogu dengimas"];

const SYSTEM = `Tu esi tyrėjas, kuris randa potencialius klientus Lietuvos laisvai samdomam svetainių ir sistemų kūrėjui.

Užduotis: rasti REALIAS, šiuo metu veikiančias Lietuvos įmones, kurioms realiai reikia svetainės arba skaitmeninės sistemos, ir jų kontaktus.

Kaip dirbti:
- Naudok web_search ir web_fetch. Geriausi šaltiniai: rekvizitai.lt (pardavimo pajamos, telefonas, el. paštas, svetainė, įmonės kodas), imones.lt, Google Maps įrašai, Facebook puslapiai.
- Pajamas imk tik iš šaltinio (pvz. rekvizitai.lt „Pardavimo pajamos“). Jei vartotojas nurodė pajamų intervalus ir įmonės pajamos nežinomos arba neatitinka – įmonės neįtrauk.
- Patikrink, ar įmonė turi svetainę. Jei turi – įtrauk tik tada, kai yra aiški spraga: svetainė neveikia, labai pasenusi, neprisitaiko prie telefono, nėra rezervacijos/užsakymo, kai verslui to reikia ir pan. Įvardink konkrečią spragą.
- Kontaktus imk tik iš šaltinių. NIEKADA neišgalvok telefono numerio, el. pašto ar įmonės kodo. Jei kažko neradai – palik tuščią eilutę "". Įmonę įtrauk tik jei yra bent telefonas arba el. paštas.
- Telefonus rašyk formatu +370 6XX XXXXX.
- Geriau mažiau, bet tikrų įmonių. Jei neradai tiek, kiek prašyta – grąžink tiek, kiek radai.
- Neįtrauk įmonių iš „jau turimų“ sąrašo, stambių tinklų ir valstybinių įstaigų.

Pabaigoje BŪTINAI iškviesk įrankį submit_leads su visais rezultatais. Laukus pildyk lietuviškai. „reason“ – vienas konkretus sakinys, kodėl jiems reikia paslaugos (be bendrų frazių).`;

const submitTool: Anthropic.Beta.BetaTool = {
  name: "submit_leads",
  description:
    "Pateikia galutinį rastų įmonių sąrašą. Kviesk vieną kartą, kai baigei paiešką.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["leads"],
    properties: {
      leads: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "companyCode",
            "category",
            "city",
            "phone",
            "email",
            "website",
            "revenue",
            "need",
            "reason",
            "source",
          ],
          properties: {
            name: { type: "string", description: "Įmonės pavadinimas, pvz. „Dadu ledai“" },
            companyCode: { type: "string", description: "Įmonės kodas arba \"\"" },
            category: { type: "string", description: "Veiklos sritis, trumpai" },
            city: { type: "string" },
            phone: { type: "string", description: "+370 ... arba \"\"" },
            email: { type: "string", description: "El. paštas arba \"\"" },
            website: { type: "string", description: "Esama svetainė arba \"\" jei nėra" },
            revenue: { type: "string", description: "Pajamos iš šaltinio, pvz. „150–300 tūkst. € (2024)“ arba \"\"" },
            need: { type: "string", enum: [...NEEDS] },
            reason: { type: "string" },
            source: { type: "string", description: "URL, kur rasti kontaktai" },
          },
        },
      },
    },
  },
};

function buildPrompt(req: SearchRequest, exclude: string[]): string {
  const revenue = req.revenue.length
    ? REVENUE_BRACKETS.filter((r) => req.revenue.includes(r.id))
        .map((r) => r.label)
        .join(", ")
    : "nesvarbu";
  const needs = req.needs.length ? req.needs.join(", ") : "bet kuri iš: " + NEEDS.join(", ");
  const excluded = exclude.length ? exclude.join("; ") : "nėra";

  return `Rask ${req.count} įmonių.

Veiklos sritis: ${req.industry.trim() || "bet kuri, kur svetainė ar sistema realiai padidintų pardavimus (paslaugos, maitinimas, grožis, remontas ir pan.)"}
Vieta: ${req.city.trim() || "visa Lietuva"}
Metinės pajamos: ${revenue}
Ko jiems turėtų trūkti: ${needs}

Jau turimos įmonės (neįtraukti): ${excluded}`;
}

function sanitize(raw: unknown): LeadInput[] {
  const list = (raw as { leads?: unknown })?.leads;
  if (!Array.isArray(list)) return [];
  return list.map(cleanLead).filter((l): l is LeadInput => !!l && !!(l.phone || l.email));
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function parseBody(body: unknown): SearchRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const revenueIds = REVENUE_BRACKETS.map((r) => r.id) as string[];
  return {
    industry: clean(b.industry).slice(0, 200),
    city: clean(b.city).slice(0, 100),
    revenue: (Array.isArray(b.revenue) ? b.revenue : [])
      .map((r) => REVENUE_BRACKETS.find((x) => x.id === r || x.label === r)?.id)
      .filter((r): r is SearchRequest["revenue"][number] => !!r && revenueIds.includes(r)),
    needs: (Array.isArray(b.needs) ? b.needs : []).filter((n): n is SearchRequest["needs"][number] =>
      (NEEDS as readonly string[]).includes(n as string),
    ),
    count: Math.min(20, Math.max(1, Number(b.count) || 10)),
  };
}

export async function POST(request: Request) {
  const who = await me(request).catch(() => null);
  if (!who) return unauthorized();
  const user = who.id;
  if (!dbUrl()) {
    return Response.json({ error: "Nėra prijungtos duomenų bazės (DATABASE_URL)" }, { status: 503 });
  }

  const raw = await request.json().catch(() => null);
  const req = parseBody(raw);
  if (!req) return Response.json({ error: "Blogi duomenys" }, { status: 400 });
  const model = modelId(modelKey((raw as { model?: unknown } | null)?.model));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: SearchEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      if (!process.env.ANTHROPIC_API_KEY) {
        // Free path: read the public 1551.lt catalog directly; AI (if any) only writes the reasons.
        try {
          const known = await existingKeys(who.ws);
          const kw = req.industry && !anyValue(req.industry) ? req.industry : DEFAULT_KEYWORDS[Math.floor(Math.random() * DEFAULT_KEYWORDS.length)];
          const city = anyValue(req.city) ? "" : req.city;
          send({ type: "search", query: `1551.lt: ${kw}${city ? `, ${city}` : ", visa Lietuva"}` });
          const picked: Found[] = [];
          const t0 = Date.now();
          let scanned = 0;
          for (let page = 1; page <= 8 && picked.length < req.count && Date.now() - t0 < 200_000; page++) {
            const urls = await searchPage(kw, city, page, request.signal);
            if (!urls.length) break;
            for (let i = 0; i < urls.length && picked.length < req.count; i += 6) {
              const batch = await Promise.all(urls.slice(i, i + 6).map((u) => readCompany(u, request.signal).catch(() => null)));
              for (const c of batch) {
                if (!c) continue;
                scanned++;
                if (!(c.phone || c.email) || !fitsRevenue(c, req.revenue)) continue;
                const rr = ruleReason(c, req.needs, `${kw.replace(/\+/g, " ")} ${city || c.city}`.trim().toLowerCase());
                if (!rr) continue;
                if (!withoutDuplicates([c], [...known, ...picked]).fresh.length) continue;
                picked.push({ ...c, ...rr, category: c.category && c.category.length > 3 ? c.category : kw });
                send({ type: "fetch", url: c.source });
                if (picked.length >= req.count) break;
              }
            }
          }
          if (picked.length) {
            try {
              const facts = picked.map((c, n) => `${n + 1}. ${c.name} | ${c.category} | ${c.city} | apyvarta: ${c.revenue || "nežinoma"} | darbuotojai: ${c.employees || "nežinoma"} | svetainė: ${c.website || "nėra"} | Facebook: ${c.facebook ? "yra" : "nenurodyta"} | siūlyti: ${c.need}`).join("\n");
              const out = await liteText(
                "Tu padedi lietuviui, kuris skambina mažoms įmonėms ir siūlo svetaines. Kiekvienai įmonei parašyk vieną konkretų sakinį lietuviškai, kodėl verta skambinti, remdamasis TIK pateiktais faktais. Nieko neišgalvok. Grąžink tik JSON masyvą su tekstais ta pačia tvarka.",
                facts,
              );
              const a = out.indexOf("["), b = out.lastIndexOf("]");
              const arr = a >= 0 && b > a ? (JSON.parse(out.slice(a, b + 1)) as unknown[]) : [];
              arr.forEach((t, n) => {
                if (typeof t === "string" && t.trim() && picked[n]) picked[n].reason = `${t.trim().slice(0, 400)} (Pagal 1551.lt: svetainė ${picked[n].website ? "yra" : "nenurodyta"}.)`;
              });
            } catch (err) {
              console.error("[search:reasons]", err);
            }
          }
          const added = await insertLeads(
            who.ws,
            picked.map((c) => {
              const lead: Partial<Found> = { ...c };
              delete lead.facebook;
              return lead as Found;
            }),
            user,
          );
          send({ type: "result", found: scanned, added });
        } catch (err) {
          if (!request.signal.aborted) {
            console.error("[search:1551]", err);
            send({ type: "error", message: "Nepavyko perskaityti 1551.lt katalogo. Pabandyk dar kartą." });
          }
        }
        send({ type: "done" });
        controller.close();
        return;
      }

      const client = await aiClient();
      try {
        // Names already in the list, so the model doesn't return them again.
        const known = await existingKeys(who.ws);
        const exclude = known.slice(-300).map((k) => k.name.slice(0, 120));
        const messages: Anthropic.Beta.BetaMessageParam[] = [
          { role: "user", content: buildPrompt(req, exclude) },
        ];

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const s = client.beta.messages.stream(
            {
              model,
              max_tokens: 32000,
              system: SYSTEM,
              tools: [webSearch(12), { type: "web_fetch_20250910", name: "web_fetch", max_uses: 15 }, submitTool],
              tool_choice: { type: "auto" },
              messages,
            },
            { signal: request.signal },
          );

          s.on("contentBlock", (block) => {
            if (block.type !== "server_tool_use") return;
            const input = block.input as { query?: string; url?: string };
            if (block.name === "web_search" && input.query) send({ type: "search", query: input.query });
            if (block.name === "web_fetch" && input.url) send({ type: "fetch", url: input.url });
          });

          const msg = await s.finalMessage();

          if (msg.stop_reason === "refusal") {
            send({ type: "error", message: "Modelis atsisakė vykdyti šią paiešką. Pakeisk užklausą." });
            break;
          }

          const submit = msg.content.find(
            (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "submit_leads",
          );
          if (submit) {
            const found = sanitize(submit.input);
            const { fresh } = withoutDuplicates(found, await existingKeys(who.ws));
            const added = await insertLeads(who.ws, fresh, user);
            send({ type: "result", found: found.length, added });
            break;
          }

          messages.push({ role: "assistant", content: msg.content });

          if (msg.stop_reason === "pause_turn") continue;

          if (msg.stop_reason === "max_tokens") {
            send({ type: "error", message: "Atsakymas per ilgas. Sumažink įmonių kiekį." });
            break;
          }

          // Ended without submitting: ask once more for the structured result.
          messages.push({
            role: "user",
            content: "Pateik rezultatus iškviesdamas submit_leads. Jei nieko neradai – su tuščiu sąrašu.",
          });
        }
        send({ type: "done" });
      } catch (err) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }
        const message = aiErrorMessage(err);
        console.error("[search]", err);
        send({ type: "error", message });
        send({ type: "done" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
