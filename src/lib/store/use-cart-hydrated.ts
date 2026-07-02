"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "./cart";

export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    useCartStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
