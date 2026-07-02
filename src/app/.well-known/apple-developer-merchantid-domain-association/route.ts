import { NextResponse } from "next/server";
import { getApplePayDomainAssociation } from "@/lib/apple-pay";

export async function GET() {
  const content = await getApplePayDomainAssociation();

  if (!content) {
    return new NextResponse("Apple Pay domain verification file not configured", {
      status: 404,
    });
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
