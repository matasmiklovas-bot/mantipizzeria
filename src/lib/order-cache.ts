import type { Order } from "@/types";

const PREFIX = "manti-order-";

export function cacheOrderLocally(order: Order): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${order.id}`, JSON.stringify(order));
  } catch {
    // ignore quota errors
  }
}

export function readCachedOrder(id: string): Order | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Order;
  } catch {
    return null;
  }
}
