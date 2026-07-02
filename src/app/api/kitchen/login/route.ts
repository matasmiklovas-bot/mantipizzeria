import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSecureCookie } from "@/lib/cookies";

function isValidPassword(password: string): boolean {
  const expected = process.env.KITCHEN_PASSWORD;
  if (!expected) return false;
  return password.trim() === expected;
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("kitchen_session");
  return NextResponse.json({
    authenticated: session?.value === "authenticated",
  });
}

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Neteisingas slaptažodis" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("kitchen_session", "authenticated", {
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
  cookieStore.delete("kitchen_session");
  return NextResponse.json({ success: true });
}
