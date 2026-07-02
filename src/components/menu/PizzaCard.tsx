"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import type { Pizza, PizzaSize } from "@/types";
import { SIZE_LABELS, getUnitPrice } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/Button";

interface PizzaCardProps {
  pizza: Pizza;
  index: number;
}

export function PizzaCard({ pizza, index }: PizzaCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [size, setSize] = useState<PizzaSize>("large");
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(pizza, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(17,17,17,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(17,17,17,0.1)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        <img
          src={pizza.image_url}
          alt={pizza.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-end gap-2">
            <span className="font-display text-lg font-bold leading-none text-red">
              {index + 1}.
            </span>
            <h3 className="font-display text-xl font-bold uppercase leading-none tracking-wide text-red">
              {pizza.name}
            </h3>
          </div>

          <p className="mb-3 text-xs font-bold uppercase leading-relaxed tracking-wide text-black/70">
            {pizza.ingredients.join(", ")}.
          </p>
          <p className="text-sm leading-relaxed text-black/45">
            {pizza.description}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["small", "large"] as PizzaSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-left transition-all",
                size === s
                  ? "border-red bg-red/5"
                  : "border-black/10 hover:border-black/20"
              )}
            >
              <span className="block text-[11px] font-medium text-black/45">
                {SIZE_LABELS[s]}
              </span>
              <span className="font-display text-lg font-bold text-black">
                {formatPrice(getUnitPrice(pizza, s))}
              </span>
            </button>
          ))}
        </div>

        <Button onClick={handleAdd} className="w-full" variant="primary">
          {added ? (
            <>
              <Check className="w-4 h-4" />
              Pridėta
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Pridėti
            </>
          )}
        </Button>
      </div>
      </div>
    </motion.div>
  );
}
