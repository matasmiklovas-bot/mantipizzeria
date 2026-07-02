"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Lock,
  ShieldCheck,
  Clock,
  UtensilsCrossed,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { StripePayment } from "@/components/checkout/StripePayment";
import { useCartStore } from "@/lib/store/cart";
import { SIZE_LABELS, getUnitPrice } from "@/types";
import { formatPrice, cn } from "@/lib/utils";

type PaymentChoice = "card" | "cash";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const total = useCartStore((s) => s.totalPrice());
  const clearCart = useCartStore((s) => s.clearCart);

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const createOrderPayload = () => ({
    table_number: tableNumber,
    customer_name: `Staliukas ${tableNumber}`,
    customer_phone: "-",
    total_amount: total,
    items: items.map((i) => ({
      pizza_id: i.pizza.id,
      pizza_name: `${i.pizza.name} (${SIZE_LABELS[i.size]})`,
      quantity: i.quantity,
      unit_price: getUnitPrice(i.pizza, i.size),
    })),
  });

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createOrderPayload(),
          payment_method: "cash",
          payment_status: "cash_pending",
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error("Nepavyko sukurti užsakymo");

      clearCart();
      window.location.href = `/order/${order.id}`;
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createOrderPayload(),
          payment_method: "credit_card",
          payment_status: "pending",
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error("Nepavyko sukurti užsakymo");

      const payRes = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, orderId: order.id }),
      });
      const payData = await payRes.json();

      if (payData.demo) {
        await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_status: "paid" }),
        });
        clearCart();
        window.location.href = `/order/${order.id}`;
        return;
      }

      setClientSecret(payData.clientSecret);
      setOrderId(order.id);
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (orderId) {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "paid" }),
      });
    }
    clearCart();
    if (orderId) window.location.href = `/order/${orderId}`;
  };

  if (items.length === 0 && !clientSecret) {
    return (
      <>
        <Header variant="order" />
        <main className="pt-32 pb-16 min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-2xl mb-4">Krepšelis tuščias</p>
            <Link href="/menu">
              <Button>Grįžti į meniu</Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const OrderSummary = () => (
    <div className="bg-white rounded-3xl overflow-hidden card-shadow">
      <div className="relative h-32 bg-red px-6 flex items-end pb-4">
        <div>
          <p className="text-gold text-xs tracking-[0.2em] uppercase">
            Jūsų užsakymas
          </p>
          <p className="text-white font-display text-xl font-semibold">
            Staliukas {tableNumber}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {items.map((item) => {
          const unit = getUnitPrice(item.pizza, item.size);
          return (
            <div key={item.id} className="flex items-center gap-4">
              <span className="shrink-0 w-8 h-8 bg-red text-white text-sm font-bold rounded-full flex items-center justify-center">
                {item.quantity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold truncate">
                  {item.pizza.name}
                </p>
                <p className="text-black/40 text-sm">
                  {SIZE_LABELS[item.size]} · {formatPrice(unit)} / vnt.
                </p>
              </div>
              <span className="font-semibold text-black/80">
                {formatPrice(unit * item.quantity)}
              </span>
            </div>
          );
        })}

        <div className="gold-line opacity-20 my-2" />

        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Iš viso</span>
          <span className="font-display text-2xl font-bold text-red">
            {formatPrice(total)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-black/40 text-xs pt-2">
          <Clock className="w-4 h-4" />
          <span>
            Numatomas paruošimo laikas ~
            {15 + items.reduce((s, i) => s + i.quantity, 0) * 3} min
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header variant="order" />
      <main className="pt-24 pb-16 min-h-screen bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-black/50 hover:text-olive transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Grįžti į krepšelį
          </Link>

          <div className="mb-8">
            <p className="text-olive text-sm tracking-[0.2em] uppercase mb-2 font-medium">
              Beveik viskas
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Atsiskaitymas
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
            <div className="order-2 lg:order-1">
              {clientSecret ? (
                <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-olive/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-olive" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        Mokėjimas kortele
                      </h2>
                      <p className="text-black/40 text-sm">
                        Saugus mokėjimas per Stripe
                      </p>
                    </div>
                  </div>
                  <StripePayment
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={setError}
                  />
                  {error && <p className="text-red text-sm mt-4">{error}</p>}
                  <div className="flex items-center justify-center gap-2 text-black/40 text-xs mt-6">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Jūsų kortelės duomenys yra šifruojami</span>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={
                    paymentMethod === "cash" ? handleCashSubmit : handleCardSubmit
                  }
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl bg-olive/10 flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5 text-olive" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-semibold">
                          Jūsų staliukas
                        </h2>
                        <p className="text-black/40 text-sm">
                          Įveskite staliuko numerį, prie kurio sėdite
                        </p>
                      </div>
                    </div>

                    <label
                      htmlFor="table-number"
                      className="block text-sm font-medium text-black/60 mb-2"
                    >
                      Staliuko numeris
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setTableNumber(Math.max(1, tableNumber - 1))
                        }
                        className="w-12 h-14 rounded-2xl bg-sand text-black/70 text-2xl font-medium hover:bg-sand/70 transition-colors shrink-0"
                        aria-label="Sumažinti"
                      >
                        −
                      </button>
                      <input
                        id="table-number"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={99}
                        value={tableNumber}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!Number.isNaN(n))
                            setTableNumber(Math.min(99, Math.max(1, n)));
                        }}
                        className="flex-1 h-14 text-center font-display text-3xl font-bold text-red bg-sand rounded-2xl border-2 border-transparent focus:border-olive focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setTableNumber(Math.min(99, tableNumber + 1))
                        }
                        className="w-12 h-14 rounded-2xl bg-sand text-black/70 text-2xl font-medium hover:bg-sand/70 transition-colors shrink-0"
                        aria-label="Padidinti"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl bg-olive/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-olive" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-semibold">
                          Mokėjimo būdas
                        </h2>
                        <p className="text-black/40 text-sm">
                          Pasirinkite, kaip norite atsiskaityti
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                          paymentMethod === "card"
                            ? "border-olive bg-olive/5"
                            : "border-black/10 hover:border-black/20"
                        )}
                      >
                        <CreditCard className="w-5 h-5 text-olive shrink-0" />
                        <div>
                          <span className="font-medium block">Kortele</span>
                          <span className="text-black/40 text-sm">Stripe</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cash")}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                          paymentMethod === "cash"
                            ? "border-gold bg-gold/5"
                            : "border-black/10 hover:border-black/20"
                        )}
                      >
                        <Banknote className="w-5 h-5 text-gold shrink-0" />
                        <div>
                          <span className="font-medium block">Grynaisiais</span>
                          <span className="text-black/40 text-sm">
                            Prie staliuko
                          </span>
                        </div>
                      </button>
                    </div>

                    {paymentMethod === "card" && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl border border-black/10 bg-sand/50 mt-4">
                        <ShieldCheck className="w-5 h-5 text-olive shrink-0" />
                        <span className="text-sm text-black/60">
                          Saugus mokėjimas per Stripe
                        </span>
                      </div>
                    )}

                    {paymentMethod === "cash" && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl border border-gold/30 bg-gold/5 mt-4">
                        <Banknote className="w-5 h-5 text-gold shrink-0" />
                        <span className="text-sm text-black/60">
                          Sumokėsite grynaisiais, kai atnešime picas prie
                          staliuko
                        </span>
                      </div>
                    )}

                    {error && <p className="text-red text-sm mt-4">{error}</p>}

                    <Button
                      type="submit"
                      loading={loading}
                      className="w-full mt-6"
                      size="lg"
                    >
                      {paymentMethod === "cash" ? (
                        <>
                          <Banknote className="w-4 h-4" />
                          Patvirtinti užsakymą · {formatPrice(total)}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Tęsti prie mokėjimo · {formatPrice(total)}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="order-1 lg:order-2 lg:sticky lg:top-24">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
