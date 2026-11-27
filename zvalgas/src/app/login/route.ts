import { missingConfig } from "@/lib/oauth";
import { me } from "@/lib/session";
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
  const e = new URL(request.url).searchParams.get("e") ?? "";
  return new Response(loginHtml({ error: ERRORS[e] ?? "", missing: missingConfig() }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" },
  });
}
