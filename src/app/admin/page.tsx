"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Pizza,
  DollarSign,
  QrCode,
  ClipboardList,
  ChefHat,
  RefreshCw,
  ExternalLink,
  Database,
  CheckCircle2,
  AlertTriangle,
  Power,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DailyStats, Order } from "@/types";
import { formatPrice } from "@/lib/utils";

interface DbHealth {
  ok: boolean;
  configured: boolean;
  pizzaCount?: number;
  hint?: string;
}

interface SiteSettings {
  orderingEnabled: boolean;
  busyMode: boolean;
}

function Toggle({
  on,
  onClick,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
        on ? "bg-olive" : "bg-black/20"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [payDomains, setPayDomains] = useState<
    { domain: string; applePay: string; googlePay: string }[] | null
  >(null);
  const [payDomainsLoading, setPayDomainsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statsRes, ordersRes, healthRes, settingsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/orders"),
      fetch("/api/health/db"),
      fetch("/api/settings"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (ordersRes.ok) setOrders(await ordersRes.json());
    if (healthRes.ok) setDbHealth(await healthRes.json());
    if (settingsRes.ok) setSettings(await settingsRes.json());
    setLoading(false);
  }, []);

  const updateSettings = async (updates: Partial<SiteSettings>) => {
    if (!settings) return;
    setSettingsSaving(true);
    // Optimistinis atnaujinimas
    setSettings({ ...settings, ...updates });
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setSettings(await res.json());
      } else {
        setSettings(settings);
      }
    } catch {
      setSettings(settings);
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const registerPayDomains = async () => {
    setPayDomainsLoading(true);
    try {
      const res = await fetch("/api/stripe/register-domains", { method: "POST" });
      const data = await res.json();
      if (res.ok) setPayDomains(data.domains ?? []);
    } finally {
      setPayDomainsLoading(false);
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.payment_status !== "pending"
  );
  const unpaidCash = orders.filter(
    (o) => o.payment_method === "cash" && o.payment_status === "cash_pending"
  );

  const cards = stats
    ? [
        {
          label: "Dienos pajamos",
          value: formatPrice(stats.revenue),
          icon: DollarSign,
          color: "text-olive bg-olive/10",
        },
        {
          label: "Užsakymų šiandien",
          value: String(stats.orderCount),
          icon: ShoppingBag,
          color: "text-red bg-red/10",
        },
        {
          label: "Vidutinė suma",
          value: formatPrice(stats.averageOrder),
          icon: TrendingUp,
          color: "text-gold bg-gold/10",
        },
        {
          label: "Aktyvūs dabar",
          value: String(activeOrders.length),
          icon: ClipboardList,
          color: "text-black bg-sand",
        },
      ]
    : [];

  const quickLinks = [
    { href: "/admin/menu", label: "Valdyti meniu", icon: Pizza, desc: "Pridėti, redaguoti picas" },
    { href: "/admin/orders", label: "Užsakymai", icon: ClipboardList, desc: "Būsenos, apmokėjimai" },
    { href: "/admin/qr", label: "QR kodai", icon: QrCode, desc: "Generuoti ir spausdinti" },
    { href: "/kitchen", label: "Virtuvė & Kasa", icon: ChefHat, desc: "Atidaryti virtuvės ekraną" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Statistika</h1>
          <p className="text-black/50 text-sm mt-1">Manti Pizzeria valdymo panelė</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Atnaujinti
          </Button>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" />
              Svetainė
            </Button>
          </a>
        </div>
      </div>

      {dbHealth && !dbHealth.ok && (
        <div className="bg-red/10 border border-red/30 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red shrink-0" />
          <p className="text-black/70 flex-1">
            <span className="font-semibold text-red">Duomenų bazė neveikia.</span>{" "}
            {dbHealth.hint ?? "Patikrinkite Supabase raktus Vercel."}
          </p>
        </div>
      )}

      {unpaidCash.length > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-black/70">
            <span className="font-semibold text-gold">{unpaidCash.length}</span> grynais
            užsakymai laukia apmokėjimo
          </p>
          <Link href="/admin/orders">
            <Button size="sm" className="bg-gold text-black hover:bg-gold/90">
              Peržiūrėti
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 card-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-black/50 text-xs">{card.label}</p>
                <p className="font-display text-xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-2xl p-5 card-shadow hover:shadow-lg transition-shadow group"
          >
            <link.icon className="w-6 h-6 text-olive mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-semibold mb-1">{link.label}</p>
            <p className="text-black/45 text-sm">{link.desc}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 card-shadow mb-8">
        <div className="flex items-center gap-3 mb-5">
          <Power className="w-6 h-6 text-olive" />
          <h2 className="font-display text-xl font-semibold">Svetainės valdymas</h2>
        </div>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Priimti užsakymus</p>
              <p className="text-black/50 text-sm">
                Išjungus, klientai matys „Šiuo metu uždaryta" ir negalės užsakyti.
                Virtuvė ir admin veikia toliau.
              </p>
            </div>
            <Toggle
              on={settings?.orderingEnabled ?? true}
              disabled={!settings || settingsSaving}
              onClick={() =>
                updateSettings({ orderingEnabled: !settings?.orderingEnabled })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                Piko režimas
              </p>
              <p className="text-black/50 text-sm">
                Kai virtuvė nespėja: klientams rodomas įspėjimas apie ilgesnį
                laukimą, o numatomas laikas pailgėja +20 min.
              </p>
            </div>
            <Toggle
              on={settings?.busyMode ?? false}
              disabled={!settings || settingsSaving}
              onClick={() => updateSettings({ busyMode: !settings?.busyMode })}
            />
          </div>
        </div>
        {settings && !settings.orderingEnabled && (
          <div className="mt-5 bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-sm text-red font-medium">
            Svetainė išjungta — klientai negali pateikti užsakymų.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 card-shadow mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-olive" />
          <h2 className="font-display text-xl font-semibold">Sistemos būklė</h2>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            {dbHealth?.ok ? (
              <CheckCircle2 className="w-5 h-5 text-olive" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red" />
            )}
            <span className="font-medium">Duomenų bazė:</span>
            <span className={dbHealth?.ok ? "text-olive" : "text-red"}>
              {dbHealth === null
                ? "Tikrinama..."
                : dbHealth.ok
                  ? `Veikia (${dbHealth.pizzaCount} picos)`
                  : "Neveikia"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 card-shadow mb-8">
        <h2 className="font-display text-xl font-semibold mb-2">Apple Pay / Google Pay</h2>
        <p className="text-black/50 text-sm mb-4">
          Spauskite, kad Stripe užregistruotų jūsų domeną. Apple Pay veikia Safari
          (iPhone/Mac). Tikri pinigai reikalauja Stripe live raktų Vercel.
        </p>
        <Button onClick={registerPayDomains} loading={payDomainsLoading} size="sm">
          Registruoti mokėjimo domeną
        </Button>
        {payDomains && (
          <ul className="mt-4 space-y-2 text-sm">
            {payDomains.map((d) => (
              <li key={d.domain} className="flex flex-wrap gap-2">
                <span className="font-medium">{d.domain}</span>
                <span className="text-black/50">
                  Apple Pay: {d.applePay} · Google Pay: {d.googlePay}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats && stats.popularPizzas.length > 0 && (
        <div className="bg-white rounded-2xl p-6 card-shadow">
          <div className="flex items-center gap-3 mb-6">
            <Pizza className="w-6 h-6 text-olive" />
            <h2 className="font-display text-xl font-semibold">Populiariausios picos šiandien</h2>
          </div>
          <div className="space-y-3">
            {stats.popularPizzas.map((pizza, i) => (
              <div key={pizza.name} className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-sand flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium">{pizza.name}</span>
                <span className="text-black/50">{pizza.count} vnt.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!stats && !loading && (
        <div className="bg-white rounded-2xl p-12 card-shadow text-center">
          <p className="text-black/50">Statistika bus rodoma, kai bus pateikti užsakymai.</p>
        </div>
      )}
    </div>
  );
}
