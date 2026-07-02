"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const STATUSES: OrderStatus[] = ["received", "preparing", "ready", "delivered"];

interface OrderTrackerProps {
  status: OrderStatus;
}

export function OrderTracker({ status }: OrderTrackerProps) {
  const currentIndex = STATUSES.indexOf(status);

  return (
    <div className="py-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-black/10 mx-8" />
        <motion.div
          className="absolute top-5 left-8 h-0.5 bg-olive origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: currentIndex / (STATUSES.length - 1) }}
          style={{ width: "calc(100% - 4rem)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {STATUSES.map((s, i) => {
          const isComplete = i <= currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={s} className="flex flex-col items-center relative z-10 flex-1">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  isComplete
                    ? "bg-olive text-white"
                    : "bg-white border-2 border-black/10 text-black/30"
                )}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{i + 1}</span>
                )}
              </motion.div>
              <span
                className={cn(
                  "mt-3 text-xs sm:text-sm font-medium text-center",
                  isComplete ? "text-olive" : "text-black/40"
                )}
              >
                {ORDER_STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
