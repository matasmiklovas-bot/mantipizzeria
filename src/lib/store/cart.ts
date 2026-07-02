import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Pizza, CartItem, PizzaSize } from "@/types";
import { getUnitPrice } from "@/types";

interface CartStore {
  tableNumber: number;
  items: CartItem[];
  setTableNumber: (n: number) => void;
  addItem: (pizza: Pizza, size: PizzaSize) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      tableNumber: 1,
      items: [],

      setTableNumber: (n) => set({ tableNumber: n }),

      addItem: (pizza, size) => {
        const lineId = `${pizza.id}-${size}`;
        const items = get().items;
        const existing = items.find((i) => i.id === lineId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === lineId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ items: [...items, { id: lineId, pizza, size, quantity: 1 }] });
        }
      },

      removeItem: (lineId) =>
        set({ items: get().items.filter((i) => i.id !== lineId) }),

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === lineId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (s, i) => s + getUnitPrice(i.pizza, i.size) * i.quantity,
          0
        ),
    }),
    { name: "manti-cart-v3" }
  )
);
