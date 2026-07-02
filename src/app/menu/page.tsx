"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShoppingBag, Clock, MoonStar } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PizzaCard } from "@/components/menu/PizzaCard";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/store/cart";
import type { Pizza } from "@/types";

interface SiteSettings {
  orderingEnabled: boolean;
  busyMode: boolean;
}

export default function MenuPage() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const totalItems = useCartStore((s) => s.totalItems());

  useEffect(() => {
    fetch("/api/pizzas")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !Array.isArray(data)) {
          setError(true);
          return;
        }
        setPizzas(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSettings(s))
      .catch(() => {});
  }, []);

  if (settings && !settings.orderingEnabled) {
    return (
      <>
        <Header variant="order" />
        <main className="pt-24 min-h-screen bg-cream flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <MoonStar className="w-8 h-8 text-red" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-3">
              Šiuo metu uždaryta
            </h1>
            <p className="text-black/60 mb-6">
              Atsiprašome — užsakymai šiuo metu nepriimami. Užsukite vėliau!
            </p>
            <Link href="/">
              <Button variant="outline">Grįžti į pagrindinį</Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header variant="order" />
      <main className="pt-24 pb-32 min-h-screen bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-olive text-sm tracking-[0.2em] uppercase mb-2 font-medium">
              Mūsų meniu
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Pasirinkite picą
            </h1>
          </div>

          {settings?.busyMode && (
            <div className="max-w-lg mx-auto mb-8 bg-gold/10 border border-gold/40 rounded-2xl px-5 py-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-gold shrink-0" />
              <p className="text-sm text-black/70">
                Šiuo metu daug užsakymų — picų teks palaukti šiek tiek ilgiau.
                Ačiū už kantrybę!
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-red" aria-label="Kraunama" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-black/60 mb-4">Nepavyko užkrauti meniu.</p>
              <Button onClick={() => window.location.reload()}>Bandyti dar kartą</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {pizzas.map((pizza, i) => (
                <PizzaCard key={pizza.id} pizza={pizza} index={i} />
              ))}
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-cream/95 backdrop-blur-md border-t border-black/5 z-40">
            <div className="max-w-lg mx-auto">
              <Link href="/cart">
                <Button className="w-full" size="lg">
                  <ShoppingBag className="w-5 h-5" />
                  Krepšelis ({totalItems})
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
