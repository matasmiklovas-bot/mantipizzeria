/**
 * Google Gemini over its REST API, used when GEMINI_API_KEY is set (free tier, no card).
 * Web search uses Gemini's built-in Google Search grounding.
 */
const BASE = process.env.GEMINI_BASE || "https://generativelanguage.googleapis.com/v1beta/models";

export const geminiOn = () => !!process.env.GEMINI_API_KEY;
const model = () => process.env.GEMINI_MODEL || "gemini-flash-latest";
/** Model for Google Search grounding (the free tier allows it only on some models). */
export const searchModel = () => process.env.GEMINI_SEARCH_MODEL || model();

type Turn = { role: "user" | "assistant"; content: string };
type Part = { text?: string };
type Chunk = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string; groundingMetadata?: { webSearchQueries?: string[] } }[];
  error?: { message?: string; status?: string };
};

function body(system: string, turns: Turn[], search: boolean) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
    ...(search ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { maxOutputTokens: 8192 },
  });
}

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function geminiErrorMessage(e: unknown): string {
  if (e instanceof GeminiError) {
    if (e.status === 400 && /API key/i.test(e.message)) return "Neteisingas GEMINI_API_KEY.";
    if (e.status === 403) return "Gemini raktas neturi teisės. Patikrink raktą.";
    if (e.status === 429) return "Pasiektas nemokamas Gemini limitas. Pabandyk po minutės.";
    return `Gemini klaida (${e.status}).`;
  }
  return "Gemini neatsakė.";
}

const FALLBACK = "gemini-flash-lite-latest";

async function call(path: string, payload: string, signal?: AbortSignal, m?: string) {
  const go = (name: string) =>
    fetch(`${BASE}/${name}:${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: payload,
      signal,
    });
  let r = await go(m || model());
  // Busy model (503): try the lighter one once.
  if (r.status === 503 && (m || model()) !== FALLBACK) r = await go(FALLBACK);
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as Chunk;
    throw new GeminiError(r.status, j.error?.message ?? r.statusText);
  }
  return r;
}

const textOf = (c: Chunk) => (c.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");

/** Streams the answer; returns the whole text and the Google searches it ran. */
export async function geminiStream(
  system: string,
  turns: Turn[],
  opts: { search?: boolean; signal?: AbortSignal; model?: string; onText?: (t: string) => void; onSearch?: (q: string) => void } = {},
) {
  const r = await call("streamGenerateContent?alt=sse", body(system, turns, !!opts.search), opts.signal, opts.model ?? (opts.search ? searchModel() : undefined));
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let all = "";
  const seen = new Set<string>();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let c: Chunk;
      try {
        c = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      const t = textOf(c);
      if (t) {
        all += t;
        opts.onText?.(t);
      }
      for (const q of c.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? []) {
        if (!seen.has(q)) {
          seen.add(q);
          opts.onSearch?.(q);
        }
      }
    }
  }
  return { text: all, searches: [...seen] };
}

export async function geminiText(system: string, prompt: string, opts: { search?: boolean; signal?: AbortSignal } = {}) {
  const r = await call("generateContent", body(system, [{ role: "user", content: prompt }], !!opts.search), opts.signal);
  const j = (await r.json()) as Chunk;
  return textOf(j).trim();
}
