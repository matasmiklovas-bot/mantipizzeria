import { aiAvailable, aiClient, aiErrorMessage, modelId, modelKey, liteActive, liteErrorMessage, liteText } from "@/lib/ai";
import { json, me, unauthorized } from "@/lib/session";
import { get, patch } from "@/lib/store";

export const maxDuration = 60;

const s = (v: unknown, n = 400) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : "");

const SYSTEM = `Tu padedi lietuviui, kuris šaltu skambučiu parduoda svetaines ir paprastas sistemas mažoms įmonėms.
Iš įmonės duomenų parašyk trumpą skambučio planą lietuviškai, paprasta šnekamąja kalba, be oficialumo ir be išgalvotų faktų.
Formatas tiksliai toks (be įžangos):
**Pradžia:** 1–2 sakiniai, ką pasakyti po pasisveikinimo, pritaikyti šiai įmonei.
**Kabliukas:** vienas konkretus dalykas, kurį jie greičiausiai praranda dabar.
**Jei sako…**
- „<tikėtinas prieštaravimas>“ – <ką atsakyti, 1 sakinys>
- „<tikėtinas prieštaravimas>“ – <ką atsakyti, 1 sakinys>
- „<tikėtinas prieštaravimas>“ – <ką atsakyti, 1 sakinys>
**Siūlyk:** ką konkrečiai siūlyti ir kokio susitikimo prašyti.
Iš viso iki 110 žodžių.`;

/** Short AI call plan for one company, stored on the lead so the whole team sees it. */
export async function POST(request: Request) {
  const who = await me(request).catch(() => null);
  if (!who) return unauthorized();
  if (!aiAvailable()) return json({ error: "AI neįjungtas." }, 503);
  const body = (await request.json().catch(() => ({}))) as { leadId?: unknown; model?: unknown; force?: unknown; text?: unknown };
  const id = typeof body.leadId === "string" && /^[\w.-]{1,100}$/.test(body.leadId) ? body.leadId : "";
  const l = id ? await get("leads", id) : null;
  if (!l) return json({ error: "Nerasta įmonė." }, 404);
  // A plan the browser wrote itself (the server couldn't reach the AI): store it for the team.
  if (typeof body.text === "string") {
    const text = body.text.trim().slice(0, 3000);
    if (!text) return json({ error: "Tuščias atsakymas." }, 400);
    await patch("leads", id, { aiBrief: text, aiBriefAt: Date.now() });
    return json({ brief: text });
  }
  if (typeof l.aiBrief === "string" && l.aiBrief && body.force !== true) return json({ brief: l.aiBrief });

  const facts = [
    `Įmonė: ${s(l.name)}`,
    `Sritis: ${s(l.category)}`,
    `Miestas: ${s(l.city)}`,
    `Apyvarta: ${s(l.revenue) || "nežinoma"}`,
    `Darbuotojai: ${s(l.employees) || "nežinoma"}`,
    `Svetainė: ${s(l.website) || "nėra"}`,
    `Ką siūlyti: ${s(l.need) || "Svetainė"}`,
    `Kodėl skambinti: ${s(l.reason, 900)}`,
  ].join("\n");

  if (liteActive()) {
    try {
      const text = await liteText(SYSTEM, facts);
      if (!text) return json({ error: "Tuščias atsakymas." }, 502);
      await patch("leads", id, { aiBrief: text.slice(0, 3000), aiBriefAt: Date.now() });
      return json({ brief: text });
    } catch (err) {
      console.error("[brief:lite]", err, liteErrorMessage(err));
      return json({ client: { system: SYSTEM, prompt: facts } });
    }
  }

  try {
    const client = await aiClient();
    const msg = await client.messages.create({
      model: modelId(modelKey(body.model)),
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: facts }],
    });
    if (msg.stop_reason === "refusal") return json({ error: "AI atsisakė." }, 422);
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (!text) return json({ error: "Tuščias atsakymas." }, 502);
    await patch("leads", id, { aiBrief: text.slice(0, 3000), aiBriefAt: Date.now() });
    return json({ brief: text });
  } catch (err) {
    console.error("[brief]", err);
    return json({ error: aiErrorMessage(err) }, 502);
  }
}
