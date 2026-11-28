import { timingSafeEqual } from "node:crypto";
import { baseUrl, OAUTH_COOKIE, redirectUri } from "@/lib/oauth";
import { allowed, cookieValue, createSession, secure, SESSION_COOKIE, SESSION_DAYS } from "@/lib/session";
import { joinCookie, workspaceForNewUser } from "@/lib/join";
import { getUser, upsertUser } from "@/lib/store";

type IdToken = { iss?: string; aud?: string; sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string; exp?: number };

const back = (request: Request, e: string, clear = true) =>
  new Response(null, {
    status: 302,
    headers: {
      Location: `${baseUrl(request)}/login?e=${e}`,
      ...(clear ? { "Set-Cookie": `${OAUTH_COOKIE}=; Path=/; Max-Age=0` } : {}),
    },
  });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const saved = cookieValue(request, OAUTH_COOKIE) ?? "";
  if (url.searchParams.get("error")) return back(request, "cancelled");
  if (!code || !state || state.length !== saved.length || !timingSafeEqual(Buffer.from(state), Buffer.from(saved))) {
    return back(request, "state");
  }

  // Exchange the code directly with Google over TLS; the id_token in this response can be trusted without re-verifying its signature.
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
    }),
  }).catch(() => null);
  if (!res?.ok) return back(request, "google");
  const tok = (await res.json().catch(() => ({}))) as { id_token?: string };
  let claims: IdToken = {};
  try {
    claims = JSON.parse(Buffer.from(String(tok.id_token).split(".")[1], "base64url").toString("utf8"));
  } catch {
    return back(request, "google");
  }
  const okIss = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!okIss || claims.aud !== process.env.GOOGLE_CLIENT_ID || !claims.sub || !claims.email || claims.email_verified === false) {
    return back(request, "google");
  }
  if (!allowed(claims.email)) return back(request, "denied");

  const id = `g_${claims.sub}`;
  try {
    const name = (claims.name || claims.email.split("@")[0]).slice(0, 120);
    const known = await getUser(id);
    const ws = known ? known.ws : await workspaceForNewUser(request, id, name);
    await upsertUser({ id, email: claims.email, name, avatar: claims.picture?.startsWith("https://") ? claims.picture : "", ws });
  } catch {
    return back(request, "db");
  }
  const flags = `Path=/; HttpOnly; SameSite=Lax${secure(request) ? "; Secure" : ""}`;
  const headers = new Headers({ Location: `${baseUrl(request)}/` });
  headers.append("Set-Cookie", `${SESSION_COOKIE}=${createSession(id)}; Max-Age=${SESSION_DAYS * 86400}; ${flags}`);
  headers.append("Set-Cookie", `${OAUTH_COOKIE}=; Path=/; Max-Age=0`);
  headers.append("Set-Cookie", joinCookie(request, ""));
  return new Response(null, { status: 302, headers });
}
