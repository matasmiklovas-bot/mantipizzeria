import Anthropic from "@anthropic-ai/sdk";
import { aiAvailable, aiClient, aiErrorMessage, modelId, modelKey, webSearch } from "@/lib/ai";
import { me, unauthorized } from "@/lib/session";
import { get, list } from "@/lib/store";

export const maxDuration = 120;

const MAX_TURNS = 24;
const MAX_CHARS = 6000;

const SYSTEM = `Tu esi Claude, įmontuotas į „Coldline“: tai Lietuvos komandos, kuri šaltais skambučiais parduoda svetaines, el. parduotuves, rezervacijų ir vidines sistemas mažoms įmonėms, darbo vieta.

Kaip rašyti:
- Lietuviškai, paprastai ir žmogiškai, kaip kolega, ne kaip robotas. Trumpai: dažniausiai 2–6 sakiniai arba trumpas sąrašas.
- Jei prašo frazės skambučiui, duok tikslų tekstą, kurį galima pasakyti balsu, be oficialumo.
- Būk tiesus: jei idėja silpna ar kontaktas prastas, taip ir pasakyk.
- Neišgalvok faktų apie įmones: telefonų, pajamų, el. paštų, klientų. Jei reikia patikrinti, naudok web_search ir nurodyk šaltinį. Jei nežinai, pasakyk.
- Nesiūlyk meluoti klientams ir nekurk netikrų atsiliepimų ar „neseniai darėm panašiai“ istorijų.

Ką gali: patarti, kaip atsakyti į prieštaravimus, parašyti el. laišką ar SMS po skambučio, paruošti pasiūlymą, ištirti įmonę internete, padėti išsirinkti, kam skambinti pirmiausia, iš žemiau pateiktų duomenų.`;

type Lead = Record<string, unknown>;
const s = (v: unknown, n = 300) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : "");

function leadLine(l: Lead) {
  return [s(l.name, 120), s(l.city, 60), s(l.category, 80), s(l.revenue, 60), s(l.need, 40), `statusas: ${s(l.status, 20) || "new"}`]
    .filter(Boolean)
    .join(" · ");
}

async function contextBlock(leadId: string | null): Promise<string> {
  const parts: string[] = [];
  const { docs } = await list("leads");
  const leads = docs.map((d) => d.data);
  const by: Record<string, number> = {};
  for (const l of leads) by[s(l.status, 20) || "new"] = (by[s(l.status, 20) || "new"] || 0) + 1;
  parts.push(`Komandos sąraše ${leads.length} įmonių. Pagal statusą: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(", ") || "nėra"}. (new = neskambinta, no_answer = neatsiliepė, declined = nenori, thinking = pagalvos, interested = nori)`);
  const top = leads
    .filter((l) => (s(l.status, 20) || "new") === "new")
    .sort((a, b) => (Number(b.revenueValue) || 0) - (Number(a.revenueValue) || 0))
    .slice(0, 15);
  if (top.length) parts.push(`Neskambintos su didžiausia apyvarta:\n${top.map((l) => `- ${leadLine(l)}`).join("\n")}`);
  if (leadId) {
    const l = await get("leads", leadId);
    if (l) {
      parts.push(
        `Šiuo metu atidaryta įmonė:\n${leadLine(l)}\nTelefonas: ${s(l.phone, 60)}\nEl. paštas: ${s(l.email, 120)}\nSvetainė: ${s(l.website, 200) || "nėra"}\nĮmonės kodas: ${s(l.companyCode, 30)}\nDarbuotojai: ${s(l.employees, 60)}\nKodėl skambinti: ${s(l.reason, 800)}\nŠaltinis: ${s(l.source, 300)}`,
      );
    }
  }
  return parts.join("\n\n");
}

function cleanMessages(raw: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role === "assistant" ? "assistant" : "user";
    const text = s((m as { content?: unknown }).content, MAX_CHARS).trim();
    if (text) out.push({ role, content: text });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out.length && out[out.length - 1].role === "user" ? out : null;
}

// Best effort per-instance limit, so one person can't run up the bill by accident.
const hits = new Map<string, number[]>();
function limited(id: string) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > 12;
}

export async function POST(request: Request) {
  const who = await me(request).catch(() => null);
  if (!who) return unauthorized();
  if (!aiAvailable()) return Response.json({ error: "AI šiame serveryje neįjungtas.", code: "no_key" }, { status: 503 });
  if (limited(who.id)) return Response.json({ error: "Per daug klausimų per minutę. Palauk truputį." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { messages?: unknown; leadId?: unknown; model?: unknown };
  const model = modelId(modelKey(body.model));
  const messages = cleanMessages(body.messages);
  if (!messages) return Response.json({ error: "Tuščias klausimas." }, { status: 400 });
  const leadId = typeof body.leadId === "string" && /^[\w.-]{1,100}$/.test(body.leadId) ? body.leadId : null;

  const client = await aiClient();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const context = await contextBlock(leadId);
        const convo: Anthropic.Beta.BetaMessageParam[] = [...messages];
        for (let round = 0; round < 4; round++) {
          const s2 = client.beta.messages.stream(
            {
              model,
              max_tokens: 16000,
              output_config: { effort: "low" },
              system: [
                { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
                { type: "text", text: `Šiandien ${new Date().toLocaleDateString("lt-LT")}. Klausia: ${who.name}.\n\n${context}` },
              ],
              tools: [webSearch(3)],
              messages: convo,
            },
            { signal: request.signal },
          );
          s2.on("streamEvent", (ev) => {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") send({ type: "text", text: ev.delta.text });
          });
          s2.on("contentBlock", (block) => {
            if (block.type === "server_tool_use" && block.name === "web_search") {
              const q = (block.input as { query?: string }).query;
              if (q) send({ type: "search", query: q });
            }
          });
          const msg = await s2.finalMessage();
          if (msg.stop_reason === "refusal") {
            send({ type: "error", message: "Claude į tai neatsakys. Paklausk kitaip." });
            break;
          }
          if (msg.stop_reason !== "pause_turn") break;
          convo.push({ role: "assistant", content: msg.content });
        }
        send({ type: "done" });
      } catch (err) {
        if (!request.signal.aborted) {
          const message = aiErrorMessage(err);
          console.error("[chat]", err);
          send({ type: "error", message });
          send({ type: "done" });
        }
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
