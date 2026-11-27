/**
 * Free AI with no key and no account: Pollinations' OpenAI-compatible endpoint (anonymous tier).
 * No web search. Rate-limited per server IP, so a busy answer (429) is retried once.
 */
const URL_ = process.env.FREE_AI_URL || "https://text.pollinations.ai/openai";
const MODEL = process.env.FREE_AI_MODEL || "openai";

type Turn = { role: "user" | "assistant"; content: string };

export class FreeAiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function freeErrorMessage(e: unknown): string {
  if (e instanceof FreeAiError) {
    if (e.status === 429 || e.status === 402) return "Nemokamas AI leidžia 1 atsakymą per 45 s. Pastoviam AI savininkas gali įjungti nemokamą raktą: Nustatymai → AI.";
    return `Nemokamas AI neatsakė (${e.status}). Pabandyk dar kartą.`;
  }
  return "Nepavyko gauti atsakymo iš AI.";
}

async function post(system: string, turns: Turn[], stream: boolean, signal?: AbortSignal) {
  const payload = JSON.stringify({
    model: MODEL,
    stream,
    private: true,
    messages: [{ role: "system", content: system }, ...turns],
  });
  // Give up if the model hasn't started answering in 20 s (the caller then hands the question to the browser).
  const go = async () => {
    const ctl = new AbortController();
    const stop = () => ctl.abort();
    signal?.addEventListener("abort", stop);
    const timer = setTimeout(stop, 20_000);
    try {
      return await fetch(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: payload, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  };
  let r = await go();
  if (r.status === 429 || r.status >= 500) {
    await new Promise((ok) => setTimeout(ok, 2000));
    r = await go();
  }
  if (!r.ok) throw new FreeAiError(r.status, (await r.text().catch(() => "")).slice(0, 300) || r.statusText);
  return r;
}

export async function freeStream(system: string, turns: Turn[], opts: { signal?: AbortSignal; onText?: (t: string) => void } = {}) {
  const r = await post(system, turns, true, opts.signal);
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let all = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const t = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (t) {
          all += t;
          opts.onText?.(t);
        }
      } catch {
        // partial or non-JSON line
      }
    }
  }
  if (!all.trim()) throw new FreeAiError(502, "empty answer");
  return { text: all, searches: [] as string[] };
}

export async function freeText(system: string, prompt: string, opts: { signal?: AbortSignal } = {}) {
  const r = await post(system, [{ role: "user", content: prompt }], false, opts.signal);
  const j = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  const text = (j.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new FreeAiError(502, "empty answer");
  return text;
}
