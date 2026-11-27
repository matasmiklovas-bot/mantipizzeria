import Anthropic from "@anthropic-ai/sdk";
import { getVercelOidcToken } from "@vercel/oidc";
import { freeErrorMessage, freeStream, freeText } from "./free";
import { GeminiError, geminiErrorMessage, geminiOn, geminiStream, geminiText } from "./gemini";

/**
 * Which AI answers:
 * - ANTHROPIC_API_KEY set: Claude, straight to the Anthropic API.
 * - AI_GATEWAY=1 on Vercel: Claude through Vercel AI Gateway with the deployment's OIDC token (needs a card on the Vercel account).
 * - Otherwise ("lite"): Gemini when GEMINI_API_KEY is set or the owner saved a key in Nustatymai,
 *   and the free keyless model when Gemini is missing or fails.
 *   Works with no setup at all.
 */
export const MODELS = {
  haiku: { label: "Haiku", note: "greitas ir pigus", gateway: "anthropic/claude-haiku-5.5", direct: "claude-haiku-5-5" },
  sonnet: { label: "Sonnet", note: "geresnis", gateway: "anthropic/claude-sonnet-5.5", direct: "claude-sonnet-5-5" },
  opus: { label: "Opus", note: "protingiausias, brangesnis", gateway: "anthropic/claude-opus-5.5", direct: "claude-opus-5-5" },
} as const;
export type ModelKey = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelKey = "haiku";

export const modelKey = (v: unknown): ModelKey => (typeof v === "string" && v in MODELS ? (v as ModelKey) : DEFAULT_MODEL);

const direct = () => !!process.env.ANTHROPIC_API_KEY;
const gateway = () => process.env.AI_GATEWAY === "1" && (!!process.env.VERCEL || !!process.env.VERCEL_OIDC_TOKEN);

/** AI always runs: with no keys the free model answers. */
export const aiAvailable = () => true;

/** Claude (key or gateway) is in use, so the Haiku/Sonnet/Opus choice means something. */
export const claudeActive = () => direct() || gateway();

/** No Claude: Gemini if its key is set, otherwise (or when Gemini fails) the free model. */
export const liteActive = () => !claudeActive();

type Turn = { role: "user" | "assistant"; content: string };
const NO_WEB = "\n\nInterneto paieškos dabar neturi: remkis tik pateiktais duomenimis ir savo žiniomis, o faktų apie konkrečias įmones neišgalvok.";

/** Streams a lite answer. Falls back to the free model if Gemini fails before writing anything. */
export async function liteStream(
  system: string,
  turns: Turn[],
  opts: { search?: boolean; signal?: AbortSignal; onText?: (t: string) => void; onSearch?: (q: string) => void } = {},
) {
  if (await geminiOn()) {
    let wrote = false;
    try {
      return await geminiStream(system, turns, { ...opts, onText: (t) => ((wrote = true), opts.onText?.(t)) });
    } catch (err) {
      if (wrote || opts.signal?.aborted) throw err;
      console.error("[ai:gemini→free]", err);
    }
  }
  return freeStream(system + NO_WEB, turns, opts);
}

export async function liteText(system: string, prompt: string, opts: { signal?: AbortSignal } = {}) {
  if (await geminiOn()) {
    try {
      return await geminiText(system, prompt, opts);
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      console.error("[ai:gemini→free]", err);
    }
  }
  return freeText(system, prompt, opts);
}

export const liteErrorMessage = (err: unknown) => (err instanceof GeminiError ? geminiErrorMessage(err) : freeErrorMessage(err));

export function modelId(k: ModelKey): string {
  return direct() ? MODELS[k].direct : MODELS[k].gateway;
}

export async function aiClient(): Promise<Anthropic> {
  if (direct()) return new Anthropic();
  const token = await getVercelOidcToken();
  return new Anthropic({ apiKey: token, baseURL: "https://ai-gateway.vercel.sh" });
}

/** Web tools every model on the list accepts. */
export const webSearch = (maxUses: number): Anthropic.Messages.WebSearchTool20250305 => ({
  type: "web_search_20250305",
  name: "web_search",
  max_uses: maxUses,
  user_location: { type: "approximate", country: "LT" },
});

export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const body = JSON.stringify(err.error ?? "");
    if (err.status === 402) return "Baigėsi nemokami AI kreditai šį mėnesį.";
    if (err.status === 403 && body.includes("customer_verification_required"))
      return "AI dar neįjungtas. Savininkas gali jį įjungti per minutę: Nustatymai → AI.";
    if (err instanceof Anthropic.AuthenticationError) return "AI prisijungimas nepavyko.";
    if (err instanceof Anthropic.RateLimitError) return "Per daug užklausų. Pabandyk po minutės.";
    return `AI klaida (${err.status ?? "?"}).`;
  }
  return "Nepavyko gauti atsakymo iš AI.";
}
