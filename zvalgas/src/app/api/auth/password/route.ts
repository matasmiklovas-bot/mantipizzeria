import { joinCookie, workspaceForNewUser } from "@/lib/join";
import { checkPassword, hashPassword, json, sessionCookie } from "@/lib/session";
import { createPasswordUser, findByUsername } from "@/lib/store";

const NAME = /^[\p{L}\p{N}._-]{3,32}$/u;
const fail = (error: string, status = 400) => json({ error }, status);
const pause = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { username?: unknown; password?: unknown; mode?: unknown; join?: unknown };
  const raw = typeof b.username === "string" ? b.username.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const mode = b.mode === "register" ? "register" : "login";
  if (!NAME.test(raw)) return fail("Vardas: 3–32 raidės ar skaičiai, be tarpų.");
  if (password.length < 6 || password.length > 200) return fail("Slaptažodis turi būti bent 6 simbolių.");
  const username = raw.toLowerCase();
  const id = `u_${username}`;

  try {
    if (mode === "register") {
      const display = raw.charAt(0).toLocaleUpperCase("lt") + raw.slice(1);
      if (await findByUsername(username)) return fail("Toks vardas jau užimtas. Pasirink kitą arba prisijunk.", 409);
      const ws = await workspaceForNewUser(request, id, display, typeof b.join === "string" ? b.join : "");
      const ok = await createPasswordUser(id, username, display, hashPassword(password), ws);
      if (!ok) return fail("Toks vardas jau užimtas. Pasirink kitą arba prisijunk.", 409);
    } else {
      const u = await findByUsername(username);
      if (!u || !u.hash || !checkPassword(password, u.hash)) {
        await pause();
        return fail(u ? "Neteisingas slaptažodis." : "Tokio vartotojo nėra. Spausk „Sukurti paskyrą“.", 401);
      }
    }
  } catch (e) {
    if ((e as Error).message === "NO_DATABASE") return fail("Nėra prijungtos duomenų bazės.", 503);
    throw e;
  }
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", sessionCookie(request, id));
  if (mode === "register") headers.append("Set-Cookie", joinCookie(request, ""));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
