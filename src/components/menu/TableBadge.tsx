"use client";

import { useCartStore } from "@/lib/store/cart";

export function TableBadge() {
  const tableNumber = useCartStore((s) => s.tableNumber);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-red/10 border border-red/20 px-5 py-2.5">
      <span className="text-red/70 text-sm font-medium">Staliukas</span>
      <span className="font-display text-2xl font-bold text-red leading-none">
        {tableNumber}
      </span>
    </div>
  );
}
