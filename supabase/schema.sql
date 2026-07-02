-- Manti Pizzeria Database Schema

-- Pizzas table
CREATE TABLE IF NOT EXISTS pizzas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  price_small DECIMAL(10,2) NOT NULL,
  price_large DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurant tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  table_number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'preparing', 'ready', 'delivered')),
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('apple_pay', 'google_pay', 'credit_card', 'debit_card', 'cash')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'cash_pending')),
  total_amount DECIMAL(10,2) NOT NULL,
  estimated_time INTEGER NOT NULL DEFAULT 20,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pizza_id UUID NOT NULL REFERENCES pizzas(id),
  pizza_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable Realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Row Level Security
ALTER TABLE pizzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public read access for pizzas and tables
CREATE POLICY "Pizzas are viewable by everyone" ON pizzas FOR SELECT USING (true);
CREATE POLICY "Tables are viewable by everyone" ON restaurant_tables FOR SELECT USING (true);

-- Public can create orders
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Anyone can update order status" ON orders FOR UPDATE USING (true);

CREATE POLICY "Anyone can create order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view order items" ON order_items FOR SELECT USING (true);

-- Admin policies (service role bypasses RLS)
CREATE POLICY "Admin can manage pizzas" ON pizzas FOR ALL USING (true);
CREATE POLICY "Admin can manage tables" ON restaurant_tables FOR ALL USING (true);
