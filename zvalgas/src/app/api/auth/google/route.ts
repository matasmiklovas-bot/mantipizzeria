import { randomBytes } from "node:crypto";
import { googleConfigured, OAUTH_COOKIE, redirectUri, baseUrl } from "@/lib/oauth";
import { secure } from "@/lib/session";

export async function GET(request: Request) {
  if (!googleConfigured()) return Response.redirect(`${baseUrl(request)}/login?e=config`, 302);
  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const cookie = `${OAUTH_COOKIE}=${state}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${secure(request) ? "; Secure" : ""}`;
  return new Response(null, { status: 302, headers: { Location: url.toString(), "Set-Cookie": cookie } });
}
