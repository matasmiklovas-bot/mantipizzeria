"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "./cart";

export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useCartStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }

    const unsub = persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
