import { NextResponse } from "next/server";
import { ensureApplePayDomainsRegistered } from "@/lib/apple-pay";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { amount, orderId } = await request.json();

    if (!stripe) {
      return NextResponse.json({
        clientSecret: "demo_secret",
        demo: true,
      });
    }

    await ensureApplePayDomainsRegistered();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch {
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
