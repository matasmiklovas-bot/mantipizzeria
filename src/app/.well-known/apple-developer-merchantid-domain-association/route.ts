import { NextResponse } from "next/server";
import { ensurePaymentMethodDomainsRegistered } from "@/lib/payment-domains";

/** Stripe handles Apple Pay domain verification via Payment Method Domains. */
export async function GET() {
  return NextResponse.json({
    message: "Use Stripe Payment Method Domains API",
    register: "/api/stripe/register-domains",
  });
}

export async function POST(request: Request) {
  const domains = await ensurePaymentMethodDomainsRegistered(request);
  return NextResponse.json({ ok: true, domains });
}
