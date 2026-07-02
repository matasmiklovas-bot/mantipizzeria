import { getPizzaById } from "@/lib/db";
import type { CreateOrderInput } from "@/lib/db";
import {
  getUnitPrice,
  SIZE_LABELS,
  type PaymentMethod,
  type PaymentStatus,
  type PizzaSize,
} from "@/types";

function parseSize(pizzaName: string): PizzaSize {
  if (pizzaName.includes(SIZE_LABELS.small)) return "small";
  return "large";
}

export async function validateAndBuildOrder(
  body: Record<string, unknown>
): Promise<CreateOrderInput> {
  const tableNumber = Number(body.table_number);
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 99) {
    throw new Error("INVALID_TABLE");
  }

  const paymentMethod = body.payment_method as PaymentMethod;
  const paymentStatus = body.payment_status as PaymentStatus;

  if (paymentMethod === "cash" && paymentStatus !== "cash_pending") {
    throw new Error("INVALID_PAYMENT");
  }
  const stripeMethods: PaymentMethod[] = [
    "credit_card",
    "apple_pay",
    "google_pay",
  ];
  if (stripeMethods.includes(paymentMethod) && paymentStatus !== "pending") {
    throw new Error("INVALID_PAYMENT");
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("INVALID_ITEMS");
  }

  let total = 0;
  const items: CreateOrderInput["items"] = [];

  for (const raw of rawItems) {
    const item = raw as Record<string, unknown>;
    const pizzaId = String(item.pizza_id ?? "");
    const pizzaName = String(item.pizza_name ?? "");
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    if (!pizzaId || !pizzaName || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error("INVALID_ITEMS");
    }

    const pizza = await getPizzaById(pizzaId);
    if (!pizza || !pizza.available) {
      throw new Error("INVALID_PIZZA");
    }

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(pizza.id)) {
      throw new Error("INVALID_PIZZA");
    }

    const size = parseSize(pizzaName);
    const expectedPrice = getUnitPrice(pizza, size);
    if (Math.abs(unitPrice - expectedPrice) > 0.01) {
      throw new Error("INVALID_PRICE");
    }

    total += expectedPrice * quantity;
    items.push({
      pizza_id: pizza.id,
      pizza_name: pizzaName,
      quantity,
      unit_price: expectedPrice,
    });
  }

  const claimedTotal = Number(body.total_amount);
  if (Math.abs(claimedTotal - total) > 0.01) {
    throw new Error("INVALID_TOTAL");
  }

  return {
    table_number: tableNumber,
    customer_name: String(body.customer_name ?? `Staliukas ${tableNumber}`),
    customer_phone: String(body.customer_phone ?? "-"),
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    total_amount: total,
    items,
  };
}
