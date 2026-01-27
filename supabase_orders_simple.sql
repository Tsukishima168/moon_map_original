-- =============================================
-- STEP 1: 只建立核心表格（最簡化版本）
-- =============================================
-- 如果出錯，請一步一步執行，找出問題所在

-- 1. 建立 orders 表（簡化版，不含外鍵）
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Customer Information（不含外鍵）
  user_id UUID,  -- 暫時不加外鍵約束
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Order Details
  total_amount INTEGER NOT NULL,
  pickup_date DATE NOT NULL,
  order_note TEXT,
  
  -- Payment & Status
  payment_status TEXT DEFAULT 'pending',
  payment_last_5_digits TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  
  -- Source Tracking
  source TEXT DEFAULT 'website',
  ga_client_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT
);

-- 2. 建立 order_items 表
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  item_name TEXT NOT NULL,
  item_spec TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 建立基本索引
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 4. 啟用 RLS（但設定寬鬆政策）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 允許所有人查詢和新增（暫時）
CREATE POLICY "Allow all to insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to select orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow all to insert order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to select order_items" ON order_items FOR SELECT USING (true);

-- 完成！
-- 測試：INSERT INTO orders (order_number, customer_name, customer_phone, total_amount, pickup_date) 
--       VALUES ('TEST001', '測試客戶', '0912345678', 100, CURRENT_DATE + 1);
