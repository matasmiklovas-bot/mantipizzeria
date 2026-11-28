import { baseUrl } from "@/lib/oauth";
import { SESSION_COOKIE } from "@/lib/session";

const clear = `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;

export async function POST() {
  return new Response(null, { status: 204, headers: { "Set-Cookie": clear } });
}

export async function GET(request: Request) {
  return new Response(null, { status: 302, headers: { Location: `${baseUrl(request)}/login`, "Set-Cookie": clear } });
}
