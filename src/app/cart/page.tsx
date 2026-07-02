"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.totalPrice());

  if (items.length === 0) {
    return (
      <>
        <Header variant="order" />
        <main className="pt-32 pb-16 min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center px-4">
            <p className="font-display text-2xl font-semibold mb-2">Krepšelis tuščias</p>
            <p className="text-black/50 mb-6">Pridėkite picų iš meniu</p>
            <Link href="/menu">
              <Button>Grįžti į meniu</Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header variant="order" />
      <main className="pt-24 pb-16 min-h-screen bg-cream">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-black/50 hover:text-olive transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Grįžti į meniu
          </Link>

          <h1 className="font-display text-3xl font-bold mb-8">Jūsų krepšelis</h1>

          <div className="space-y-4 mb-8">
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 card-shadow">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-medium">Iš viso</span>
              <span className="font-display text-2xl font-bold text-red">
                {formatPrice(total)}
              </span>
            </div>
            <Link href="/checkout">
              <Button className="w-full" size="lg">
                Pereiti prie apmokėjimo
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
