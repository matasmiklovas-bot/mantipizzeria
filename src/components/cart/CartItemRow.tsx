"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem } from "@/types";
import { SIZE_LABELS, getUnitPrice } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const unitPrice = getUnitPrice(item.pizza, item.size);

  return (
    <div className="flex gap-4 p-4 bg-white rounded-2xl card-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold truncate">
            {item.pizza.name}
          </h3>
          <span className="text-xs px-2 py-0.5 bg-sand rounded-full text-black/60 shrink-0">
            {SIZE_LABELS[item.size]}
          </span>
        </div>
        <p className="text-black/50 text-sm">{formatPrice(unitPrice)}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="w-8 h-8 rounded-full bg-sand flex items-center justify-center hover:bg-sand/80 transition-colors"
              aria-label="Sumažinti"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="w-8 h-8 rounded-full bg-sand flex items-center justify-center hover:bg-sand/80 transition-colors"
              aria-label="Padidinti"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-red">
              {formatPrice(unitPrice * item.quantity)}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="p-1.5 text-black/30 hover:text-red transition-colors"
              aria-label="Pašalinti"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
