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

interface StripePaymentFormProps {
  clientSecret: string;
  orderId?: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentForm({
  orderId,
  onSuccess,
  onError,
}: Omit<StripePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  const returnUrl = orderId
    ? `${window.location.origin}/order/${orderId}`
    : `${window.location.origin}/checkout`;

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={expressReady ? "space-y-4" : "hidden"}>
        <ExpressCheckoutElement
          options={{
            buttonType: { applePay: "buy", googlePay: "buy" },
            buttonTheme: { applePay: "black", googlePay: "black" },
            layout: { maxColumns: 1, maxRows: 2 },
          }}
          onReady={({ availablePaymentMethods }) => {
            setExpressReady(!!availablePaymentMethods);
          }}
          onConfirm={confirmPayment}
        />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-xs text-black/40 uppercase tracking-wide">
            arba kortele
          </span>
          <div className="h-px flex-1 bg-black/10" />
        </div>
      </div>

      <PaymentElement
        options={{
          layout: "tabs",
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
        }}
      />
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Apmokėti
      </Button>
    </form>
  );
}

export function StripePayment({
  clientSecret,
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
      <PaymentForm orderId={orderId} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
