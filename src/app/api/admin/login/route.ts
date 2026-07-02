import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSecureCookie } from "@/lib/cookies";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return NextResponse.json({
    authenticated: session?.value === "authenticated",
  });
}

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password.trim() !== expected) {
    return NextResponse.json({ error: "Neteisingas slaptažodis" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_session", "authenticated", {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return NextResponse.json({ success: true });
}
