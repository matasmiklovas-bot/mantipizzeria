"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Pizza,
  ClipboardList,
  QrCode,
  LogOut,
  ChefHat,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Statistika", icon: LayoutDashboard },
  { href: "/admin/menu", label: "Meniu", icon: Pizza },
  { href: "/admin/orders", label: "Užsakymai", icon: ClipboardList },
  { href: "/admin/qr", label: "QR kodai", icon: QrCode },
  { href: "/kitchen", label: "Virtuvė & Kasa", icon: ChefHat },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [ready, setReady] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/admin/login");
        } else {
          setReady(true);
        }
      })
      .catch(() => router.replace("/admin/login"));
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-olive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <aside className="w-64 bg-black text-white shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Logo className="h-10 mb-2" />
          <p className="text-white/40 text-xs">Admin panelė</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors",
                pathname === item.href
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Atsijungti
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="md:hidden bg-black text-white p-4 flex items-center justify-between">
          <span className="font-display font-semibold">Manti Admin</span>
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  pathname === item.href ? "bg-white/10" : ""
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            ))}
          </div>
        </div>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
