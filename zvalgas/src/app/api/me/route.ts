import { aiAvailable, claudeActive } from "@/lib/ai";
import { geminiOn } from "@/lib/gemini";
import { json, me, unauthorized } from "@/lib/session";

export async function GET(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  return json({ id: u.id, name: u.name, email: u.email, avatar: u.avatar, owner: u.owner, ai: aiAvailable(), models: claudeActive(), aiFull: claudeActive() || (await geminiOn()), admin: u.admin, team: u.wsName });
}
