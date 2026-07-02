export type OrderStatus = "received" | "preparing" | "ready" | "delivered";

export type PaymentMethod =
  | "apple_pay"
  | "google_pay"
  | "credit_card"
  | "debit_card"
  | "cash";

export type PaymentStatus = "pending" | "paid" | "cash_pending";

export type PizzaSize = "small" | "large";

export const SIZE_LABELS: Record<PizzaSize, string> = {
  small: "Maža 30 cm",
  large: "Didelė 50 cm",
};

export interface Pizza {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  price_small: number;
  price_large: number;
  image_url: string;
  available: boolean;
  created_at?: string;
}

export function getUnitPrice(pizza: Pizza, size: PizzaSize): number {
  return size === "small" ? pizza.price_small : pizza.price_large;
}

export interface CartItem {
  id: string;
  pizza: Pizza;
  size: PizzaSize;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  pizza_id: string;
  pizza_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  order_number: number;
  table_number: number;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  estimated_time: number;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface TableConfig {
  id: string;
  number: number;
  active: boolean;
}

export interface DailyStats {
  revenue: number;
  orderCount: number;
  averageOrder: number;
  popularPizzas: { name: string; count: number }[];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Gautas",
  preparing: "Ruošiamas",
  ready: "Paruoštas",
  delivered: "Pristatytas",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  credit_card: "Kreditinė kortelė",
  debit_card: "Debetinė kortelė",
  cash: "Grynaisiais",
};
