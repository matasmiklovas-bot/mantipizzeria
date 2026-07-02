"use client";

import { useEffect, useState } from "react";
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

interface StripePaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentForm({ onSuccess, onError }: Omit<StripePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Mokėjimo klaida");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never" },
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
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  if (!stripePromise) {
    return (
      <p className="text-sm text-black/50 text-center py-4">
        Stripe nėra sukonfigūruotas. Naudokite demo režimą arba sukonfigūruokite .env
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
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
