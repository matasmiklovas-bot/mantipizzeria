import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Pages only. "/" checks the account again against the database; API routes answer 401 themselves.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && !readSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
