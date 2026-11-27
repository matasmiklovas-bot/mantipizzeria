import { APP_HTML } from "@/generated/app-html";
import { baseUrl } from "@/lib/oauth";
import { me } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return Response.redirect(`${baseUrl(request)}/login`, 302);
  return new Response(APP_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
    },
  });
}
