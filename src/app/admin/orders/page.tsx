"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import type { Order, OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types";
import { formatPrice, formatTime, cn } from "@/lib/utils";
import { Banknote, Trash2, Search, Undo2, Pencil, BrushCleaning } from "lucide-react";

const STATUS_OPTIONS: OrderStatus[] = ["received", "preparing", "ready", "delivered"];

type Filter = "all" | "active" | "delivered" | "unpaid";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === "active" && (o.status === "delivered" || o.payment_status === "pending"))
        return false;
      if (filter === "delivered" && o.status !== "delivered") return false;
      if (
        filter === "unpaid" &&
        !(o.payment_method === "cash" && o.payment_status === "cash_pending")
      )
        return false;
      if (search && !String(o.table_number).includes(search) && !String(o.order_number).includes(search))
        return false;
      return true;
    });
  }, [orders, filter, search]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  const setPaymentStatus = async (id: string, paid: boolean) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: paid ? "paid" : "cash_pending" }),
    });
    fetchOrders();
  };

  const changeTable = async (order: Order) => {
    const value = prompt("Naujas staliuko numeris (1–99):", String(order.table_number));
    if (!value) return;
    const table = parseInt(value, 10);
    if (!Number.isInteger(table) || table < 1 || table > 99) {
      alert("Neteisingas staliuko numeris");
      return;
    }
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_number: table }),
    });
    fetchOrders();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Ar tikrai norite ištrinti šį užsakymą?")) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    fetchOrders();
  };

  const clearDelivered = async () => {
    const deliveredCount = orders.filter((o) => o.status === "delivered").length;
    if (deliveredCount === 0) return;
    if (!confirm(`Ištrinti visus pristatytus užsakymus (${deliveredCount})?`)) return;
    setClearing(true);
    try {
      await fetch("/api/orders?scope=delivered", { method: "DELETE" });
      await fetchOrders();
    } finally {
      setClearing(false);
    }
  };

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Visi" },
    { id: "active", label: "Aktyvūs" },
    { id: "unpaid", label: "Grynais laukia" },
    { id: "delivered", label: "Pristatyti" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold">Užsakymai</h1>
        <div className="flex items-center gap-3">
          {deliveredCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearDelivered}
              loading={clearing}
              className="text-black/60"
            >
              <BrushCleaning className="w-4 h-4" />
              Išvalyti pristatytus ({deliveredCount})
            </Button>
          )}
          <div className="flex items-center gap-2 text-black/50 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Tiesioginis · {orders.length} iš viso
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              filter === f.id
                ? "bg-black text-white"
                : "bg-white text-black/60 hover:bg-sand"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative mb-6 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
        <Input
          placeholder="Ieškoti pagal staliuką ar #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 card-shadow text-center">
          <p className="text-black/50">Užsakymų nerasta</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-6 card-shadow">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-display text-xl font-bold">
                      #{order.order_number}
                    </span>
                    <button
                      onClick={() => changeTable(order)}
                      title="Pakeisti staliuką"
                      className="group"
                    >
                      <Badge variant="olive">
                        Staliukas {order.table_number}
                        <Pencil className="w-3 h-3 ml-1 inline opacity-40 group-hover:opacity-100" />
                      </Badge>
                    </button>
                    <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    {order.payment_method === "cash" &&
                      order.payment_status === "cash_pending" && (
                        <Badge variant="gold">Grynais · Nesumokėta</Badge>
                      )}
                    {order.payment_status === "paid" && (
                      <Badge variant="olive">Sumokėta</Badge>
                    )}
                  </div>
                  <p className="text-black/40 text-sm">
                    {formatTime(order.created_at)} ·{" "}
                    {PAYMENT_METHOD_LABELS[order.payment_method]}
                  </p>
                </div>
                <span className="font-display text-xl font-bold text-red">
                  {formatPrice(order.total_amount)}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {order.items?.map((item) => (
                  <p key={item.id} className="text-sm text-black/70">
                    {item.quantity}× {item.pizza_name} —{" "}
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {order.payment_method === "cash" &&
                  order.payment_status === "cash_pending" && (
                    <Button
                      size="sm"
                      onClick={() => setPaymentStatus(order.id, true)}
                      className="bg-gold text-black hover:bg-gold/90"
                    >
                      <Banknote className="w-4 h-4" />
                      Patvirtinti apmokėjimą
                    </Button>
                  )}
                {order.payment_method === "cash" &&
                  order.payment_status === "paid" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPaymentStatus(order.id, false)}
                    >
                      <Undo2 className="w-4 h-4" />
                      Atšaukti apmokėjimą
                    </Button>
                  )}
                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={order.status === status ? "primary" : "outline"}
                    onClick={() => updateStatus(order.id, status)}
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteOrder(order.id)}
                  className="text-red hover:text-red ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
