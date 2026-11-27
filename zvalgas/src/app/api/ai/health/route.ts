import { aiAvailable, aiClient, aiErrorMessage, liteActive, modelId, webSearch } from "@/lib/ai";
import { freeErrorMessage, freeText } from "@/lib/free";
import { geminiErrorMessage, geminiOn, geminiStream, geminiText } from "@/lib/gemini";

/** Owner diagnostics: is AI reachable from this deployment? Needs ?k=HEALTH_KEY; disabled when HEALTH_KEY is unset. */
export async function GET(request: Request) {
  const key = process.env.HEALTH_KEY;
  if (!key || new URL(request.url).searchParams.get("k") !== key) return new Response("Not found", { status: 404 });
  const out: Record<string, unknown> = { available: aiAvailable(), direct: !!process.env.ANTHROPIC_API_KEY };
  if (liteActive()) {
    try {
      out.free = { ok: true, text: (await freeText("Atsakyk trumpai.", "Atsakyk vienu žodžiu: veikia")).slice(0, 40) };
    } catch (err) {
      out.free = { ok: false, error: freeErrorMessage(err), detail: String((err as Error)?.message ?? err).slice(0, 300) };
    }
    if (!geminiOn()) return Response.json(out, { headers: { "Cache-Control": "no-store" } });
    try {
      out.gemini = { ok: true, text: (await geminiText("Atsakyk trumpai.", "Atsakyk vienu žodžiu: veikia")).slice(0, 40) };
    } catch (err) {
      out.gemini = { ok: false, error: geminiErrorMessage(err), detail: String((err as Error)?.message ?? err).slice(0, 300) };
    }
    const tries = (new URL(request.url).searchParams.get("models") || "").split(",").filter(Boolean);
    for (const m of tries.length ? tries : [""]) {
      try {
        const r = await geminiStream("Atsakyk trumpai lietuviškai.", [{ role: "user", content: "Kokia šiandien data? Patikrink Google. Vienu sakiniu." }], { search: true, model: m || undefined });
        out[`search:${m || "default"}`] = { ok: true, searches: r.searches.length, text: r.text.slice(0, 120) };
      } catch (err) {
        out[`search:${m || "default"}`] = { ok: false, detail: String((err as Error)?.message ?? err).slice(0, 160) };
      }
    }
    return Response.json(out, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const client = await aiClient();
    const plain = await client.messages.create({
      model: modelId("haiku"),
      max_tokens: 200,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Atsakyk vienu žodžiu: veikia" }],
    });
    out.plain = { ok: true, stop: plain.stop_reason, text: plain.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").slice(0, 40) };
  } catch (err) {
    out.plain = { ok: false, error: aiErrorMessage(err), detail: String((err as Error)?.message ?? err).slice(0, 300) };
  }
  try {
    const client = await aiClient();
    const tools = await client.messages.create({
      model: modelId("haiku"),
      max_tokens: 200,
      tools: [webSearch(1), { type: "web_fetch_20250910", name: "web_fetch", max_uses: 1 }],
      messages: [{ role: "user", content: "Nenaudok įrankių. Atsakyk vienu žodžiu: veikia" }],
    });
    out.tools = { ok: true, stop: tools.stop_reason };
  } catch (err) {
    out.tools = { ok: false, error: aiErrorMessage(err), detail: String((err as Error)?.message ?? err).slice(0, 300) };
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
