"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { OrderTracker } from "@/components/order/OrderTracker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/types";
import { PAYMENT_METHOD_LABELS } from "@/types";
import { formatPrice, formatTime } from "@/lib/utils";
import { cacheOrderLocally, readCachedOrder } from "@/lib/order-cache";
import { Confetti } from "@/components/order/Confetti";

export default function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!order || !orderId) return;
    // Confetti tik pirmą kartą atidarius šio užsakymo puslapį
    const key = `manti-celebrated-${orderId}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setCelebrate(true);
      }
    } catch {
      // sessionStorage nepasiekiamas — praleidžiam
    }
  }, [order, orderId]);

  const fetchOrder = useCallback(async (id: string) => {
    const cached = readCachedOrder(id);
    if (cached) {
      setOrder(cached);
      setLoading(false);
    }

    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
      cacheOrderLocally(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    params.then(({ orderId: id }) => {
      setOrderId(id);
      fetchOrder(id);
    });
  }, [params, fetchOrder]);

  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(() => fetchOrder(orderId), 3000);
    return () => clearInterval(interval);
  }, [orderId, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-3 border-olive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 text-center">
        <p className="font-display text-xl font-semibold mb-2">Užsakymas nerastas</p>
        <p className="text-black/50 text-sm max-w-md mb-6">
          Užsakymas galėjo būti sukurtas, bet duomenų bazė neprijungta. Virtuvė
          jo gali nematyti — reikia sutvarkyti Supabase raktus Vercel.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/menu">
            <Button>Grįžti į meniu</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Pagrindinis</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {celebrate && <Confetti />}
      <Header variant="order" />
      <main className="min-h-screen bg-cream pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-black/50 hover:text-olive transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Grįžti į meniu
          </Link>

          <div className="text-center mb-8">
          <div className="w-16 h-16 bg-olive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-olive" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Ačiū už Jūsų užsakymą!
          </h1>
          <p className="text-black/60 text-lg">
            Jūsų užsakymas sėkmingai gautas. Mūsų komanda jau ruošia Jūsų picas.
          </p>
          <p className="text-black/50 mt-2">
            Kai jos bus paruoštos, atnešime jas tiesiai prie Jūsų staliuko.
          </p>
          {order.payment_method === "cash" &&
            order.payment_status === "cash_pending" && (
              <p className="text-gold font-medium mt-3">
                Sumokėsite grynaisiais, kai atnešime picas —{" "}
                {formatPrice(order.total_amount)}
              </p>
            )}
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 card-shadow mb-6">
          <OrderTracker status={order.status} />
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 card-shadow space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/50 mb-1">Užsakymo numeris</p>
              <p className="font-display text-xl font-bold">#{order.order_number}</p>
            </div>
            <div>
              <p className="text-sm text-black/50 mb-1">Staliukas</p>
              <p className="font-display text-xl font-bold">{order.table_number}</p>
            </div>
          </div>

          <div className="gold-line opacity-20" />

          <div>
            <p className="text-sm text-black/50 mb-3">Užsakytos picos</p>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span>
                    {item.pizza_name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="gold-line opacity-20" />

          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Bendra suma</span>
            <span className="font-display text-2xl font-bold text-red">
              {formatPrice(order.total_amount)}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="olive">
              {PAYMENT_METHOD_LABELS[order.payment_method]}
            </Badge>
            {order.payment_method === "cash" &&
              order.payment_status === "cash_pending" && (
                <Badge variant="gold">Nesumokėta</Badge>
              )}
            {order.payment_method === "cash" &&
              order.payment_status === "paid" && (
                <Badge variant="olive">Sumokėta</Badge>
              )}
            <Badge variant="gold">
              <Clock className="w-3 h-3 mr-1" />
              ~{order.estimated_time} min
            </Badge>
          </div>

          <p className="text-sm text-black/40 text-center">
            Užsakymo laikas: {formatTime(order.created_at)}
          </p>
        </div>
        </div>
      </main>
    </>
  );
}
