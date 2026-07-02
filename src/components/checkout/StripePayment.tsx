"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export type StripePaymentMode = "card" | "apple_pay" | "google_pay";

interface StripePaymentFormProps {
  clientSecret: string;
  mode: StripePaymentMode;
  orderId?: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentForm({
  mode,
  orderId,
  onSuccess,
  onError,
}: Omit<StripePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const returnUrl = orderId
    ? `${window.location.origin}/order/${orderId}`
    : `${window.location.origin}/checkout`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Mokėjimo klaida");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const walletOptions =
    mode === "apple_pay"
      ? { applePay: "auto" as const, googlePay: "never" as const }
      : mode === "google_pay"
        ? { applePay: "never" as const, googlePay: "auto" as const }
        : { applePay: "never" as const, googlePay: "never" as const };

  const submitLabel =
    mode === "apple_pay"
      ? "Apmokėti su Apple Pay"
      : mode === "google_pay"
        ? "Apmokėti su Google Pay"
        : "Apmokėti kortele";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: walletOptions,
        }}
      />

      {mode === "apple_pay" && (
        <p className="text-xs text-black/40 text-center">
          Apple Pay rodomas Safari naršyklėje su kortele Wallet programoje.
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}

const MODE_LABELS: Record<StripePaymentMode, { title: string; subtitle: string }> = {
  card: { title: "Mokėjimas kortele", subtitle: "Visa, Mastercard ir kitos" },
  apple_pay: { title: "Apple Pay", subtitle: "Greitas mokėjimas vienu palietimu" },
  google_pay: { title: "Google Pay", subtitle: "Greitas mokėjimas per Google" },
};

export function StripePayment({
  clientSecret,
  mode,
  orderId,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  if (!stripePromise) {
    return (
      <p className="text-sm text-black/50 text-center py-4">
        Stripe nėra sukonfigūruotas. Naudokite grynuosius arba pridėkite Stripe raktus.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: "lt",
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#6b7c3e",
            borderRadius: "12px",
          },
        },
      }}
    >
      <PaymentForm
        mode={mode}
        orderId={orderId}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

export { MODE_LABELS as STRIPE_MODE_LABELS };
