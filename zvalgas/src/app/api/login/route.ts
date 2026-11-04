import { createSession, passwordMatches, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.APP_PASSWORD) {
    return Response.json({ error: "Serveryje nenustatytas APP_PASSWORD" }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown; password?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name) return Response.json({ error: "Įrašyk vardą" }, { status: 400 });
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return Response.json({ error: "Neteisingas slaptažodis" }, { status: 401 });
  }
  const token = createSession(name)!;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`,
    },
  });
}
