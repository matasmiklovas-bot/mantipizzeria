"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, CreditCard, Banknote, Volume2, VolumeX, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Order, OrderStatus } from "@/types";
import { formatPrice, formatTime, cn } from "@/lib/utils";

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  received: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: null,
};

const STATUS_ACTION: Record<OrderStatus, string | null> = {
  received: "Pradėti ruošti",
  preparing: "Pažymėti paruošta",
  ready: "Pažymėti pristatyta",
  delivered: null,
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  received: "border-gold/60 bg-gold/5",
  preparing: "border-olive/60 bg-olive/5",
  ready: "border-green-500/60 bg-green-500/5",
  delivered: "border-white/10",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Naujas",
  preparing: "Ruošiama",
  ready: "Paruošta",
  delivered: "Pristatyta",
};

const POLL_MS = 5000;

const MENU_ORDER = [
  "Margherita",
  "Margherita Piccante",
  "Vegetariana",
  "Blue Pepperoni",
  "Nduja",
  "Prosciutto Cotto",
  "Salami Stracciatella",
  "Serrano",
  "Honey Pepperoni",
];

function sortItemsByMenu(
  items: Order["items"]
): NonNullable<Order["items"]> {
  if (!items) return [];
  return [...items].sort((a, b) => {
    const baseName = (n: string) => n.split(" (")[0].trim();
    const ai = MENU_ORDER.indexOf(baseName(a.pizza_name));
    const bi = MENU_ORDER.indexOf(baseName(b.pizza_name));
    if (ai === -1 && bi === -1) return a.pizza_name.localeCompare(b.pizza_name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function ordersSignature(orders: Order[]): string {
  return orders
    .map(
      (o) =>
        `${o.id}:${o.status}:${o.payment_status}:${o.items?.length ?? 0}`
    )
    .join("|");
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const soundOnRef = useRef(soundOn);
  const fetchingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ordersSigRef = useRef("");

  soundOnRef.current = soundOn;

  const playChime = useCallback(() => {
    if (!soundOnRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const notes = [880, 1108, 1318];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + i * 0.16;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.35, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // ignore audio errors
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetch("/api/kitchen/orders");
      if (!res.ok) return;
      const data: Order[] = await res.json();

      const freshIds: string[] = [];
      for (const o of data) {
        if (!knownIds.current.has(o.id)) {
          knownIds.current.add(o.id);
          if (!firstLoad.current) freshIds.push(o.id);
        }
      }

      if (freshIds.length > 0) {
        playChime();
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          freshIds.forEach((id) => next.add(id));
          return next;
        });
        freshIds.forEach((id) =>
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 12000)
        );
      }

      firstLoad.current = false;
      const sig = ordersSignature(data);
      if (sig !== ordersSigRef.current) {
        ordersSigRef.current = sig;
        setOrders(data);
      }
      setLoading(false);
    } finally {
      fetchingRef.current = false;
    }
  }, [playChime]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    setOrders((prev) => {
      const next = prev
        .map((o) => (o.id === id ? { ...o, status } : o))
        .filter((o) => o.status !== "delivered");
      ordersSigRef.current = ordersSignature(next);
      return next;
    });

    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchOrders();
    }
  };

  const markAsPaid = async (id: string) => {
    setOrders((prev) => {
      const next = prev.map((o) =>
        o.id === id ? { ...o, payment_status: "paid" as const } : o
      );
      ordersSigRef.current = ordersSignature(next);
      return next;
    });

    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "paid" }),
      });
    } catch {
      fetchOrders();
    }
  };

  const handleLogout = async () => {
    await fetch("/api/kitchen/login", { method: "DELETE" });
    window.location.href = "/kitchen/login";
  };

  const totalPizzas = orders.reduce(
    (sum, o) => sum + (o.items?.reduce((s, i) => s + i.quantity, 0) ?? 0),
    0
  );

  const unpaidCash = orders.filter(
    (o) => o.payment_method === "cash" && o.payment_status === "cash_pending"
  );
  const unpaidCashTotal = unpaidCash.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/brand/logo.png"
              alt="Mantì Pizzeria"
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block h-10 w-px bg-white/15" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold leading-none">
                Virtuvė & Kasa
              </h1>
              <p className="text-white/40 text-sm mt-1">
                {orders.length} aktyvūs užsakymai · {totalPizzas} picos
                {unpaidCash.length > 0 && (
                  <span className="text-gold">
                    {" "}
                    · {unpaidCash.length} grynais laukia ({formatPrice(unpaidCashTotal)})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                soundOn
                  ? "bg-olive/20 text-olive"
                  : "bg-white/10 text-white/50"
              )}
            >
              {soundOn ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              {soundOn ? "Garsas įjungtas" : "Garsas išjungtas"}
            </button>
            <div className="flex items-center gap-2 text-white/50 px-4 py-2.5 rounded-full bg-white/5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Tiesioginis</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Atsijungti</span>
            </button>
          </div>
        </div>

        {unpaidCash.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
            <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4">
              <p className="text-gold/80 text-sm">Grynais laukia</p>
              <p className="font-display text-3xl font-bold text-gold">
                {unpaidCash.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-white/50 text-sm">Suma grynais</p>
              <p className="font-display text-3xl font-bold">
                {formatPrice(unpaidCashTotal)}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/40 text-2xl font-display">
              Nėra aktyvių užsakymų
            </p>
            <p className="text-white/20 mt-2">Laukiama naujų užsakymų...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {orders.map((order) => {
              const nextStatus = STATUS_FLOW[order.status];
              const actionLabel = STATUS_ACTION[order.status];
              const isNew = newOrderIds.has(order.id);

              return (
                <div
                  key={order.id}
                  className={cn(
                    "rounded-2xl p-5 border-2 transition-all duration-300 flex flex-col",
                    STATUS_STYLES[order.status],
                    isNew && "ring-4 ring-gold animate-pulse",
                    order.payment_method === "cash" &&
                      order.payment_status === "cash_pending" &&
                      "ring-2 ring-gold/60"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-red text-white w-20 h-20 rounded-2xl flex flex-col items-center justify-center leading-none shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-white/70">
                          Staliukas
                        </span>
                        <span className="font-display text-4xl font-bold">
                          {order.table_number}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-1",
                          order.status === "received" && "bg-gold/20 text-gold",
                          order.status === "preparing" &&
                            "bg-olive/20 text-olive",
                          order.status === "ready" &&
                            "bg-green-500/20 text-green-400"
                        )}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                      <p className="text-white/40 text-xs">#{order.order_number}</p>
                      <div className="flex items-center justify-end gap-1 text-white/40 text-xs mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(order.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    {sortItemsByMenu(order.items).map((item) => (
                      <div
                        key={item.id ?? `${item.pizza_id}-${item.pizza_name}`}
                        className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                      >
                        <span className="bg-white/10 text-white font-bold w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg">
                          {item.quantity}
                        </span>
                        <span className="font-medium text-lg">
                          {item.pizza_name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 space-y-3">
                    {order.payment_method === "cash" &&
                    order.payment_status === "cash_pending" ? (
                      <div className="rounded-xl border-2 border-gold/50 bg-gold/10 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-gold font-semibold">
                            <Banknote className="w-5 h-5" />
                            Grynaisiais · Nesumokėta
                          </span>
                          <span className="text-white font-bold text-lg">
                            {formatPrice(order.total_amount)}
                          </span>
                        </div>
                        <Button
                          onClick={() => markAsPaid(order.id)}
                          className="w-full bg-gold text-black hover:bg-gold/90 font-semibold"
                          size="lg"
                        >
                          <Banknote className="w-5 h-5" />
                          Patvirtinti apmokėjimą
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        {order.payment_method === "cash" ? (
                          <span className="flex items-center gap-1.5 text-olive font-medium">
                            <Banknote className="w-4 h-4" />
                            Grynaisiais · Sumokėta
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-olive font-medium">
                            <CreditCard className="w-4 h-4" />
                            Apmokėta kortele
                          </span>
                        )}
                        <span className="text-white/60 font-medium">
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {nextStatus && actionLabel && (
                    <Button
                      onClick={() => updateStatus(order.id, nextStatus)}
                      className="w-full"
                      variant={
                        order.status === "ready" ? "primary" : "secondary"
                      }
                      size="lg"
                    >
                      {actionLabel}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
