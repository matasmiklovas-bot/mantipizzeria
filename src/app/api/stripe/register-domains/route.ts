import { NextResponse } from "next/server";
import {
  ensurePaymentMethodDomainsRegistered,
  getPaymentMethodDomainStatus,
} from "@/lib/payment-domains";
import { requireStaff } from "@/lib/auth";
import { getRequestAppUrl } from "@/lib/utils";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ configured: false, domains: [] });
  }

  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domains = await getPaymentMethodDomainStatus(request);
  return NextResponse.json({
    configured: true,
    currentHost: getRequestAppUrl(request),
    domains,
  });
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domains = await ensurePaymentMethodDomainsRegistered(request);
  return NextResponse.json({
    ok: true,
    currentHost: getRequestAppUrl(request),
    domains,
  });
}
