import { claudeActive } from "@/lib/ai";
import { forgetGeminiKey, geminiErrorMessage, geminiText } from "@/lib/gemini";
import { json, me, unauthorized } from "@/lib/session";
import { getSecret, setSecret } from "@/lib/store";

/** Which AI answers, and the owner's own Gemini key (never sent back, only its last 4 characters). */
async function state() {
  const saved = await getSecret("gemini").catch(() => "");
  return {
    provider: claudeActive() ? "claude" : process.env.GEMINI_API_KEY || saved ? "gemini" : "free",
    fromEnv: !!process.env.GEMINI_API_KEY,
    saved: saved ? `••••${saved.slice(-4)}` : "",
  };
}

export async function GET(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  const st = await state();
  return json({ ...st, saved: u.admin ? st.saved : st.saved ? "nustatytas" : "", canEdit: u.admin });
}

/** Save a key after checking that Google accepts it. */
export async function POST(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  if (!u.admin) return json({ error: "AI raktą keičia platformos administratorius." }, 403);
  const body = (await request.json().catch(() => ({}))) as { key?: unknown };
  const key = typeof body.key === "string" ? body.key.trim() : "";
  // Google keys look like "AIza…" (older) or "AQ.…" (newer).
  if (!/^[\w.-]{20,200}$/.test(key)) return json({ error: "Tai nepanašu į raktą. Nukopijuok visą raktą (prasideda „AIza“ arba „AQ.“)." }, 400);
  try {
    await geminiText("Atsakyk vienu žodžiu.", "Ar veiki? Atsakyk: taip", { key });
  } catch (err) {
    return json({ error: `Google rakto nepriėmė: ${geminiErrorMessage(err)}` }, 400);
  }
  await setSecret("gemini", key);
  forgetGeminiKey();
  return json({ ok: true, ...(await state()), canEdit: true });
}

export async function DELETE(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  if (!u.admin) return json({ error: "AI raktą keičia platformos administratorius." }, 403);
  await setSecret("gemini", null);
  forgetGeminiKey();
  return json({ ok: true, ...(await state()), canEdit: true });
}
