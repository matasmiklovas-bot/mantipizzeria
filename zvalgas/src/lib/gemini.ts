/**
 * Google Gemini over its REST API, used when GEMINI_API_KEY is set (free tier, no card).
 * Web search uses Gemini's built-in Google Search grounding.
 */
const BASE = process.env.GEMINI_BASE || "https://generativelanguage.googleapis.com/v1beta/models";

import { getSecret } from "./store";

/** The key: GEMINI_API_KEY, or the one the owner pasted in Nustatymai (cached for a minute per instance). */
let cached: { key: string; at: number } | null = null;
export async function geminiKey(): Promise<string> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (cached && Date.now() - cached.at < 60_000) return cached.key;
  const key = await getSecret("gemini").catch(() => "");
  cached = { key, at: Date.now() };
  return key;
}
export const forgetGeminiKey = () => {
  cached = null;
};
export const geminiOn = async () => !!(await geminiKey());
const model = () => process.env.GEMINI_MODEL || "gemini-flash-latest";
/** Chat without web search: the fastest model, since speed matters more than depth for call advice. */
export const chatModel = () => process.env.GEMINI_CHAT_MODEL || "gemini-flash-lite-latest";
/** Model for Google Search grounding (the free tier allows it only on some models). */
export const searchModel = () => process.env.GEMINI_SEARCH_MODEL || model();

type Turn = { role: "user" | "assistant"; content: string };
type Part = { text?: string };
type Chunk = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string; groundingMetadata?: { webSearchQueries?: string[] } }[];
  error?: { message?: string; status?: string };
};

/* Short sales answers don't need the model to "think" first: that only adds seconds before the first word.
   If a model refuses the setting, it is sent without it from then on. */
let thinkOff = true;
function body(system: string, turns: Turn[], search: boolean) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
    ...(search ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { maxOutputTokens: 8192, ...(thinkOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
  });
}

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function geminiErrorMessage(e: unknown): string {
  if (e instanceof GeminiError) {
    if ((e.status === 400 || e.status === 401) && /API key|credential|token/i.test(e.message)) return "Neteisingas Gemini raktas.";
    if (e.status === 403) return "Gemini raktas neturi teisės. Patikrink raktą.";
    if (e.status === 429) return "Pasiektas nemokamas Gemini limitas. Pabandyk po minutės.";
    return `Gemini klaida (${e.status}).`;
  }
  return "Gemini neatsakė.";
}

const FALLBACK = "gemini-flash-lite-latest";

/* How the key is sent. Classic keys ("AIza…") go in x-goog-api-key; newer ones ("AQ.…") may need another form,
   so a refused key is retried the other ways and the one that works is remembered. */
type Auth = "header" | "bearer" | "query";
const authFor = new Map<string, Auth>();
const authOrder = (k: string): Auth[] => {
  const known = authFor.get(k);
  const all: Auth[] = k.startsWith("AQ.") ? ["header", "bearer", "query"] : ["header"];
  return known ? [known] : all;
};

async function call(path: string, payload: string, signal?: AbortSignal, m?: string, key?: string) {
  const k = key ?? (await geminiKey());
  let auth: Auth = authOrder(k)[0];
  const go = (name: string) => {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${BASE}/${name}:${path}${auth === "query" ? `${sep}key=${encodeURIComponent(k)}` : ""}`;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (auth === "header") headers["x-goog-api-key"] = k;
    if (auth === "bearer") headers.authorization = `Bearer ${k}`;
    return fetch(url, { method: "POST", headers, body: payload, signal });
  };
  let r = await go(m || model());
  for (const next of authOrder(k).slice(1)) {
    if (r.status !== 401 && r.status !== 403) break;
    auth = next;
    r = await go(m || model());
  }
  if (r.status !== 401 && r.status !== 403) authFor.set(k, auth); // the key got through this way
  // Newer models refuse the "no thinking" setting, sometimes with only "Request contains an invalid argument":
  // any 400 while it is on means retry without it, and stop sending it.
  if (!r.ok && r.status === 400 && thinkOff && payload.includes("thinkingConfig")) {
    thinkOff = false;
    const j = JSON.parse(payload);
    delete j.generationConfig?.thinkingConfig;
    return call(path, JSON.stringify(j), signal, m, key);
  }
  // A model name this key can't use (404): fall back to the default model.
  if (r.status === 404 && m && m !== model()) r = await go(model());
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

export async function geminiText(system: string, prompt: string, opts: { search?: boolean; signal?: AbortSignal; key?: string } = {}) {
  const r = await call("generateContent", body(system, [{ role: "user", content: prompt }], !!opts.search), opts.signal, undefined, opts.key);
  const j = (await r.json()) as Chunk;
  return textOf(j).trim();
}
