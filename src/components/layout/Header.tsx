"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

interface HeaderProps {
  variant?: "landing" | "order";
}

export function Header({ variant = "landing" }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        variant === "landing"
          ? "bg-transparent"
          : "bg-cream/95 backdrop-blur-md border-b border-black/5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center group">
            <img
              src="/brand/logo-mark.png"
              alt="Manti Pizzeria"
              className={cn(
                "h-11 w-auto object-contain transition-transform group-hover:scale-105",
                variant === "landing" && "brightness-0 invert"
              )}
            />
          </Link>

          {variant === "landing" && (
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/t/1"
                className="px-6 py-2.5 bg-gold text-black rounded-full text-sm font-semibold hover:bg-gold-light transition-all"
              >
                Užsisakyti
              </Link>
            </nav>
          )}

          {variant === "order" && (
            <div className="flex items-center gap-4">
              <Link
                href="/cart"
                className="relative p-2.5 rounded-full bg-red text-white hover:bg-red-dark transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-black text-xs font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          )}

          {variant === "landing" && (
            <button
              className="md:hidden text-white p-2"
              onClick={() => setOpen(!open)}
              aria-label="Meniu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {open && variant === "landing" && (
        <div className="md:hidden bg-black/95 backdrop-blur-lg border-t border-white/10">
          <nav className="flex flex-col p-6 gap-4">
            <Link
              href="/t/1"
              className="mt-2 px-6 py-3 bg-gold text-black rounded-full text-center font-semibold"
              onClick={() => setOpen(false)}
            >
              Užsisakyti
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
