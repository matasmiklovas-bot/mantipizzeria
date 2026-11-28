import { googleConfigured, missingConfig } from "@/lib/oauth";
import { joinCookie } from "@/lib/join";
import { cookieValue, JOIN_COOKIE, me } from "@/lib/session";
import { workspaceByInvite } from "@/lib/store";
import { loginHtml } from "./page-html";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  cancelled: "Prisijungimas atšauktas.",
  state: "Prisijungimo nuoroda pasibaigė. Bandyk dar kartą.",
  google: "Google neatsakė taip, kaip tikėtasi. Bandyk dar kartą.",
  denied: "Šiam Google paskyrai prieiga neleista.",
  db: "Nepavyko pasiekti duomenų bazės.",
  config: "Prisijungimas dar nesukonfigūruotas.",
};

export async function GET(request: Request) {
  if (await me(request).catch(() => null)) return Response.redirect(new URL("/", request.url), 302);
  const url = new URL(request.url);
  const e = url.searchParams.get("e") ?? "";
  // Invite link: remember the team for sign-up (also through Google) and greet with its name.
  const token = url.searchParams.get("join") || cookieValue(request, JOIN_COOKIE) || "";
  const w = token ? await workspaceByInvite(token).catch(() => null) : null;
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" });
  if (w) headers.append("Set-Cookie", joinCookie(request, w.invite));
  else if (token) headers.append("Set-Cookie", joinCookie(request, ""));
  const invite = w ? { name: w.name, token: w.invite } : null;
  return new Response(loginHtml({ error: ERRORS[e] ?? (token && !w ? "Kvietimo nuoroda nebegalioja. Paprašyk naujos." : ""), missing: missingConfig(), google: googleConfigured(), invite }), { headers });
}
