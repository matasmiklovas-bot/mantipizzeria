import type {
  Pizza,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DailyStats,
} from "@/types";
import { SEED_PIZZAS } from "./data/pizzas";
import { isSupabaseConfigured } from "./supabase/env";

export { isSupabaseConfigured } from "./supabase/env";


function normalizePizza(row: Record<string, unknown>): Pizza {
  const pizza = row as unknown as Pizza;
  return {
    ...pizza,
    price_small: Number(row.price_small),
    price_large: Number(row.price_large),
  };
}

// In-memory store for demo mode
let memoryPizzas: Pizza[] = [...SEED_PIZZAS];
let memoryOrders: Order[] = [];
let memoryOrderItems: OrderItem[] = [];
let orderCounter = 1000;

function generateId(): string {
  return crypto.randomUUID();
}

async function getSupabase() {
  const { createServiceClient } = await import("./supabase/server");
  return createServiceClient();
}

async function seedMenuIfEmpty(
  supabase: Awaited<ReturnType<typeof getSupabase>>
): Promise<void> {
  const { count, error: countError } = await supabase
    .from("pizzas")
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;
  if (count && count > 0) return;

  const rows = SEED_PIZZAS.map(({ id: _id, ...pizza }) => pizza);
  const { error } = await supabase.from("pizzas").insert(rows);
  if (error) throw error;
}

export async function getPizzas(): Promise<Pizza[]> {
  if (!isSupabaseConfigured()) {
    return memoryPizzas.filter((p) => p.available);
  }

  const supabase = await getSupabase();
  await seedMenuIfEmpty(supabase);
  const { data, error } = await supabase
    .from("pizzas")
    .select("*")
    .eq("available", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => normalizePizza(row as Record<string, unknown>));
}

export async function getAllPizzas(): Promise<Pizza[]> {
  if (!isSupabaseConfigured()) {
    return memoryPizzas;
  }
  const supabase = await getSupabase();
  await seedMenuIfEmpty(supabase);
  const { data, error } = await supabase
    .from("pizzas")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => normalizePizza(row as Record<string, unknown>));
}

export async function getPizzaById(id: string): Promise<Pizza | null> {
  const seedPizza = memoryPizzas.find((p) => p.id === id) ?? null;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!isSupabaseConfigured()) {
    return seedPizza;
  }

  try {
    const supabase = await getSupabase();

    if (uuidRe.test(id)) {
      const { data, error } = await supabase
        .from("pizzas")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        return normalizePizza(data as Record<string, unknown>);
      }
    }

    if (seedPizza) {
      const { data: byName, error: nameError } = await supabase
        .from("pizzas")
        .select("*")
        .eq("name", seedPizza.name)
        .maybeSingle();
      if (!nameError && byName) {
        return normalizePizza(byName as Record<string, unknown>);
      }
    }
  } catch (err) {
    console.error("Supabase getPizzaById failed:", err);
  }

  return seedPizza;
}

export async function createPizza(
  pizza: Omit<Pizza, "id" | "created_at">
): Promise<Pizza> {
  if (!isSupabaseConfigured()) {
    const newPizza: Pizza = { ...pizza, id: generateId() };
    memoryPizzas.push(newPizza);
    return newPizza;
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("pizzas")
    .insert(pizza)
    .select()
    .single();
  if (error) throw error;
  return data as Pizza;
}

export async function updatePizza(
  id: string,
  updates: Partial<Pizza>
): Promise<Pizza> {
  if (!isSupabaseConfigured()) {
    const idx = memoryPizzas.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Pizza not found");
    memoryPizzas[idx] = { ...memoryPizzas[idx], ...updates };
    return memoryPizzas[idx];
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("pizzas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Pizza;
}

export async function deletePizza(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    memoryPizzas = memoryPizzas.filter((p) => p.id !== id);
    return;
  }
  const supabase = await getSupabase();
  const { error } = await supabase.from("pizzas").delete().eq("id", id);
  if (error) throw error;
}

export interface CreateOrderInput {
  table_number: number;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  stripe_payment_intent_id?: string;
  items: { pizza_id: string; pizza_name: string; quantity: number; unit_price: number }[];
}

function createMemoryOrder(input: CreateOrderInput, estimated_time: number): Order {
  orderCounter++;
  const orderId = generateId();
  const order: Order = {
    id: orderId,
    order_number: orderCounter,
    table_number: input.table_number,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    status: "received",
    payment_method: input.payment_method,
    payment_status: input.payment_status,
    total_amount: input.total_amount,
    estimated_time,
    stripe_payment_intent_id: input.stripe_payment_intent_id,
    created_at: new Date().toISOString(),
  };
  memoryOrders.unshift(order);
  for (const item of input.items) {
    memoryOrderItems.push({
      id: generateId(),
      order_id: orderId,
      pizza_id: item.pizza_id,
      pizza_name: item.pizza_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
  }
  return { ...order, items: memoryOrderItems.filter((i) => i.order_id === orderId) };
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const estimated_time = 15 + input.items.reduce((s, i) => s + i.quantity, 0) * 3;

  if (!isSupabaseConfigured()) {
    return createMemoryOrder(input, estimated_time);
  }

  const supabase = await getSupabase();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      table_number: input.table_number,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      payment_method: input.payment_method,
      payment_status: input.payment_status,
      total_amount: input.total_amount,
      estimated_time,
      stripe_payment_intent_id: input.stripe_payment_intent_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase createOrder failed:", error);
    return createMemoryOrder(input, estimated_time);
  }

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    pizza_id: item.pizza_id,
    pizza_name: item.pizza_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);
  if (itemsError) {
    console.error("Supabase order_items insert failed:", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);
    return createMemoryOrder(input, estimated_time);
  }

  return { ...(order as Order), items: orderItems as OrderItem[] };
}

function normalizeOrder(row: Record<string, unknown>): Order {
  const { order_items, ...orderFields } = row;
  const order = orderFields as unknown as Order;
  return {
    ...order,
    total_amount: Number(order.total_amount),
    estimated_time: Number(order.estimated_time),
    items: ((order_items as OrderItem[] | null) ?? []).map((item) => ({
      ...item,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
    })),
  };
}

function sortKitchenOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const aUnpaid =
      a.payment_method === "cash" && a.payment_status === "cash_pending" ? 0 : 1;
    const bUnpaid =
      b.payment_method === "cash" && b.payment_status === "cash_pending" ? 0 : 1;
    if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export async function getOrder(id: string): Promise<Order | null> {
  const memoryOrder = memoryOrders.find((o) => o.id === id);
  if (memoryOrder) {
    return {
      ...memoryOrder,
      items: memoryOrderItems.filter((i) => i.order_id === id),
    };
  }

  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabase();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error || !order) return null;
  return normalizeOrder(order as Record<string, unknown>);
}

export async function getOrders(status?: OrderStatus): Promise<Order[]> {
  if (!isSupabaseConfigured()) {
    let orders = [...memoryOrders];
    if (status) orders = orders.filter((o) => o.status === status);
    return orders.map((o) => ({
      ...o,
      items: memoryOrderItems.filter((i) => i.order_id === o.id),
    }));
  }
  const supabase = await getSupabase();
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: orders, error } = await query;
  if (error) throw error;
  return (orders ?? []).map((row) =>
    normalizeOrder(row as Record<string, unknown>)
  );
}

export async function getKitchenOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured()) {
    return sortKitchenOrders(await getActiveKitchenOrders());
  }

  const supabase = await getSupabase();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .neq("status", "delivered")
    .neq("payment_status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  return sortKitchenOrders(
    (orders ?? []).map((row) => normalizeOrder(row as Record<string, unknown>))
  );
}

export async function getActiveKitchenOrders(): Promise<Order[]> {
  const orders = await getOrders();
  return orders.filter(
    (o) => o.status !== "delivered" && o.payment_status !== "pending"
  );
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  if (!isSupabaseConfigured()) {
    const idx = memoryOrders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Order not found");
    memoryOrders[idx] = { ...memoryOrders[idx], status };
    return {
      ...memoryOrders[idx],
      items: memoryOrderItems.filter((i) => i.order_id === id),
    };
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);
  return normalizeOrder({
    ...(data as Record<string, unknown>),
    order_items: items ?? [],
  });
}

export async function updateOrderPaymentStatus(
  id: string,
  payment_status: PaymentStatus
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const idx = memoryOrders.findIndex((o) => o.id === id);
    if (idx !== -1) memoryOrders[idx].payment_status = payment_status;
    return;
  }
  const supabase = await getSupabase();
  await supabase.from("orders").update({ payment_status }).eq("id", id);
}

export async function deleteOrder(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    memoryOrders = memoryOrders.filter((o) => o.id !== id);
    memoryOrderItems = memoryOrderItems.filter((i) => i.order_id !== id);
    return;
  }
  const supabase = await getSupabase();
  await supabase.from("order_items").delete().eq("order_id", id);
  await supabase.from("orders").delete().eq("id", id);
}

export async function getDailyStats(): Promise<DailyStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const orders = await getOrders();
  const todayOrders = orders.filter(
    (o) =>
      new Date(o.created_at) >= today &&
      o.payment_status !== "pending"
  );

  const revenue = todayOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const orderCount = todayOrders.length;
  const averageOrder = orderCount > 0 ? revenue / orderCount : 0;

  const pizzaCounts: Record<string, number> = {};
  for (const order of todayOrders) {
    for (const item of order.items ?? []) {
      pizzaCounts[item.pizza_name] =
        (pizzaCounts[item.pizza_name] ?? 0) + item.quantity;
    }
  }

  const popularPizzas = Object.entries(pizzaCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { revenue, orderCount, averageOrder, popularPizzas };
}

export function getMemoryOrders() {
  return memoryOrders;
}

export function getMemoryOrderItems() {
  return memoryOrderItems;
}
