-- =============================================
-- CRM Orders Schema - 針對您的實際資料庫結構
-- =============================================
-- 基於您現有的 profiles 表：id uuid references auth.users
-- =============================================

-- 1. 刪除舊的 orders 和 order_items 表（如果存在）
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- 2. 建立 ORDERS 表
CREATE TABLE orders (
  -- 基本資訊
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 客戶資訊（user_id 參照 auth.users，與 profiles.id 相同）
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- 訂單詳情
  total_amount INTEGER NOT NULL,
  pickup_date DATE NOT NULL,
  order_note TEXT,
  
  -- 付款與狀態
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_last_5_digits TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  
  -- 來源追蹤（GA4 + UTM）
  source TEXT DEFAULT 'website',
  ga_client_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT
);

-- 3. 建立 ORDER_ITEMS 表
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- 商品詳情
  item_name TEXT NOT NULL,
  item_spec TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 建立索引（提升查詢效能）
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 5. 自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();

-- 6. 啟用 Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 7. RLS 政策：任何人都可以新增訂單（包括訪客）
CREATE POLICY "Anyone can insert orders"
ON orders FOR INSERT
WITH CHECK (true);

-- 8. RLS 政策：任何人都可以查看訂單（暫時，之後可以收緊）
CREATE POLICY "Anyone can view orders"
ON orders FOR SELECT
USING (true);

-- 9. RLS 政策：訂單項目
CREATE POLICY "Anyone can insert order items"
ON order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
ON order_items FOR SELECT
USING (true);

-- 10. 建立分析視圖
CREATE OR REPLACE VIEW order_summary AS
SELECT 
  o.id,
  o.order_number,
  o.created_at,
  o.customer_name,
  o.customer_phone,
  o.total_amount,
  o.pickup_date,
  o.payment_status,
  o.utm_source,
  o.utm_campaign,
  p.nickname as member_nickname,
  p.mbti_type,
  COUNT(oi.id) as item_count,
  json_agg(
    json_build_object(
      'name', oi.item_name,
      'spec', oi.item_spec,
      'quantity', oi.quantity,
      'price', oi.unit_price
    )
  ) as items
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.created_at, o.customer_name, o.customer_phone, 
         o.total_amount, o.pickup_date, o.payment_status, o.utm_source, o.utm_campaign,
         p.nickname, p.mbti_type;

-- 11. 每日銷售統計視圖
CREATE OR REPLACE VIEW daily_sales AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) as member_count,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_count
FROM orders
WHERE payment_status IN ('confirmed', 'completed')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 12. 產品表現視圖
CREATE OR REPLACE VIEW product_performance AS
SELECT 
  oi.item_name,
  oi.item_spec,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue,
  AVG(oi.unit_price) as avg_price
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.payment_status IN ('confirmed', 'completed')
GROUP BY oi.item_name, oi.item_spec
ORDER BY total_revenue DESC;

-- =============================================
-- 完成！可以開始測試了
-- =============================================
-- 測試插入：
-- INSERT INTO orders (order_number, customer_name, customer_phone, total_amount, pickup_date) 
-- VALUES ('TEST001', '測試客戶', '0912345678', 100, CURRENT_DATE + 1);
