"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";

export default function TablePage({
  params,
}: {
  params: Promise<{ tableNumber: string }>;
}) {
  const router = useRouter();
  const setTableNumber = useCartStore((s) => s.setTableNumber);

  useEffect(() => {
    params.then(({ tableNumber }) => {
      const num = parseInt(tableNumber, 10);
      if (num > 0) {
        setTableNumber(num);
      }
      router.replace("/menu");
    });
  }, [params, router, setTableNumber]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-olive border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-black/60">Atidaromas meniu...</p>
      </div>
    </div>
  );
}
