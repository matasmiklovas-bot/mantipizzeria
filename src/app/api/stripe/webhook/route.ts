import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateOrderPaymentStatus } from "@/lib/db";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ received: true });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;
      if (orderId) {
        await updateOrderPaymentStatus(orderId, "paid");
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
