"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
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
  const [expressReady, setExpressReady] = useState(false);
  const [expressUnavailable, setExpressUnavailable] = useState(false);

  const returnUrl = orderId
    ? `${window.location.origin}/order/${orderId}`
    : `${window.location.origin}/checkout`;

  const isWallet = mode === "apple_pay" || mode === "google_pay";

  const confirmPayment = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await confirmPayment();
  };

  const expressOptions = {
    buttonType: { applePay: "buy" as const, googlePay: "buy" as const },
    buttonTheme: { applePay: "black" as const, googlePay: "black" as const },
    layout: { maxColumns: 1, maxRows: 1 },
    paymentMethods: {
      applePay: mode === "apple_pay" ? ("always" as const) : ("never" as const),
      googlePay: mode === "google_pay" ? ("always" as const) : ("never" as const),
      link: "never" as const,
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isWallet && (
        <div className="space-y-3">
          <ExpressCheckoutElement
            options={expressOptions}
            onReady={({ availablePaymentMethods }) => {
              const ready =
                mode === "apple_pay"
                  ? !!availablePaymentMethods?.applePay
                  : !!availablePaymentMethods?.googlePay;
              setExpressReady(ready);
              setExpressUnavailable(!ready);
            }}
            onConfirm={confirmPayment}
          />
          {expressUnavailable && (
            <p className="text-sm text-black/50 text-center">
              {mode === "apple_pay"
                ? "Apple Pay nepasiekiamas šiame įrenginyje. Naudokite Safari iPhone arba pasirinkite kitą mokėjimą."
                : "Google Pay nepasiekiamas. Naudokite Chrome arba pasirinkite kitą mokėjimą."}
            </p>
          )}
        </div>
      )}

      {mode === "card" && (
        <>
          <PaymentElement
            options={{
              layout: "tabs",
              wallets: { applePay: "never", googlePay: "never" },
            }}
          />
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Apmokėti kortele
          </Button>
        </>
      )}

      {isWallet && expressReady && (
        <p className="text-center text-xs text-black/40">
          Spauskite {mode === "apple_pay" ? "Apple Pay" : "Google Pay"} mygtuką
          viršuje
        </p>
      )}
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
