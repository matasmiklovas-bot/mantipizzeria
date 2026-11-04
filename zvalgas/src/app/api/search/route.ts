import Anthropic from "@anthropic-ai/sdk";
import { cleanLead } from "@/lib/api";
import { unauthorized, userFrom } from "@/lib/auth";
import { dbUrl, existingKeys, insertLeads } from "@/lib/db";
import { withoutDuplicates } from "@/lib/dedupe";
import { NEEDS, REVENUE_BRACKETS, type LeadInput, type SearchEvent, type SearchRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const MAX_ROUNDS = 6;

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
    revenue: (Array.isArray(b.revenue) ? b.revenue : []).filter((r): r is SearchRequest["revenue"][number] =>
      revenueIds.includes(r as string),
    ),
    needs: (Array.isArray(b.needs) ? b.needs : []).filter((n): n is SearchRequest["needs"][number] =>
      (NEEDS as readonly string[]).includes(n as string),
    ),
    count: Math.min(20, Math.max(1, Number(b.count) || 10)),
  };
}

export async function POST(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  if (!dbUrl()) {
    return Response.json({ error: "Nėra prijungtos duomenų bazės (DATABASE_URL)" }, { status: 503 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Serveryje nenustatytas ANTHROPIC_API_KEY" },
      { status: 500 },
    );
  }

  const req = parseBody(await request.json().catch(() => null));
  if (!req) return Response.json({ error: "Blogi duomenys" }, { status: 400 });

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: SearchEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      try {
        // Names already in the list, so the model doesn't return them again.
        const known = await existingKeys();
        const exclude = known.slice(-300).map((k) => k.name.slice(0, 120));
        const messages: Anthropic.Beta.BetaMessageParam[] = [
          { role: "user", content: buildPrompt(req, exclude) },
        ];

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const s = client.beta.messages.stream(
            {
              model: MODEL,
              max_tokens: 32000,
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
              output_config: { effort: "medium" },
              system: SYSTEM,
              tools: [
                {
                  type: "web_search_20260209",
                  name: "web_search",
                  max_uses: 15,
                  user_location: { type: "approximate", country: "LT" },
                },
                { type: "web_fetch_20260209", name: "web_fetch", max_uses: 20 },
                submitTool,
              ],
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
            const { fresh } = withoutDuplicates(found, await existingKeys());
            const added = await insertLeads(fresh, user);
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
        let message = "Nepavyko atlikti paieškos.";
        if (err instanceof Anthropic.AuthenticationError) message = "Neteisingas ANTHROPIC_API_KEY.";
        else if (err instanceof Anthropic.RateLimitError) message = "Pasiektas API limitas. Pabandyk po minutės.";
        else if (err instanceof Anthropic.APIError) message = `API klaida (${err.status ?? "?"}).`;
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
