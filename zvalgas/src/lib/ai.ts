import Anthropic from "@anthropic-ai/sdk";
import { getVercelOidcToken } from "@vercel/oidc";

/**
 * Claude for every AI feature.
 * - On Vercel with no key: Vercel AI Gateway, signed in with the deployment's own OIDC token (no API key, free monthly credit).
 * - With ANTHROPIC_API_KEY set: straight to the Anthropic API.
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

/** Whether AI can run here at all. */
export const aiAvailable = () => direct() || !!process.env.VERCEL || !!process.env.VERCEL_OIDC_TOKEN;

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
      return "AI dar neįjungtas: Vercel paskyroje reikia vieną kartą pridėti mokėjimo kortelę (vercel.com → AI Gateway). Tada veikia nemokami mėnesio kreditai.";
    if (err instanceof Anthropic.AuthenticationError) return "AI prisijungimas nepavyko.";
    if (err instanceof Anthropic.RateLimitError) return "Per daug užklausų. Pabandyk po minutės.";
    return `AI klaida (${err.status ?? "?"}).`;
  }
  return "Nepavyko gauti atsakymo iš AI.";
}
