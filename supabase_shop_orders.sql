-- =============================================
-- 月島甜點店主網站 - CRM 訂單系統
-- =============================================
-- 使用獨立表名，與測試網頁分開
-- 表名前綴：shop_ (代表主要商店網站)
-- =============================================

-- 1. 建立 SHOP_PROFILES 表（主網站用戶資料）
CREATE TABLE IF NOT EXISTS shop_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  nickname TEXT,
  mbti_type TEXT,
  avatar_url TEXT,
  
  -- CRM 統計欄位
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立 SHOP_ORDERS 表（主網站訂單）
CREATE TABLE shop_orders (
  -- 基本資訊
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 客戶資訊
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

-- 3. 建立 SHOP_ORDER_ITEMS 表（主網站訂單明細）
CREATE TABLE shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  
  -- 商品詳情
  item_name TEXT NOT NULL,
  item_spec TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 建立索引
CREATE INDEX idx_shop_orders_user_id ON shop_orders(user_id);
CREATE INDEX idx_shop_orders_created_at ON shop_orders(created_at DESC);
CREATE INDEX idx_shop_orders_payment_status ON shop_orders(payment_status);
CREATE INDEX idx_shop_orders_order_number ON shop_orders(order_number);
CREATE INDEX idx_shop_order_items_order_id ON shop_order_items(order_id);

-- 5. 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_shop_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shop_orders_updated_at_trigger
BEFORE UPDATE ON shop_orders
FOR EACH ROW
EXECUTE FUNCTION update_shop_orders_updated_at();

-- 6. 自動更新 shop_profiles 統計
CREATE OR REPLACE FUNCTION update_shop_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'confirmed' AND NEW.user_id IS NOT NULL THEN
    -- 嘗試更新 shop_profiles
    UPDATE shop_profiles
    SET 
      total_orders = COALESCE(total_orders, 0) + 1,
      total_spent = COALESCE(total_spent, 0) + NEW.total_amount,
      last_order_at = NEW.created_at,
      first_order_at = COALESCE(first_order_at, NEW.created_at),
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- 如果 shop_profiles 中沒有這個用戶，自動創建
    IF NOT FOUND THEN
      INSERT INTO shop_profiles (id, total_orders, total_spent, first_order_at, last_order_at)
      VALUES (NEW.user_id, 1, NEW.total_amount, NEW.created_at, NEW.created_at)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shop_profile_stats_trigger
AFTER INSERT OR UPDATE OF payment_status ON shop_orders
FOR EACH ROW
EXECUTE FUNCTION update_shop_profile_stats();

-- 7. 啟用 RLS
ALTER TABLE shop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

-- 8. RLS 政策
-- shop_profiles
CREATE POLICY "Anyone can view shop profiles"
ON shop_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert own shop profile"
ON shop_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own shop profile"
ON shop_profiles FOR UPDATE
USING (auth.uid() = id);

-- shop_orders
CREATE POLICY "Anyone can insert shop orders"
ON shop_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view shop orders"
ON shop_orders FOR SELECT
USING (true);

-- shop_order_items
CREATE POLICY "Anyone can insert shop order items"
ON shop_order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view shop order items"
ON shop_order_items FOR SELECT
USING (true);

-- 9. 分析視圖
CREATE OR REPLACE VIEW shop_order_summary AS
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
FROM shop_orders o
LEFT JOIN shop_profiles p ON o.user_id = p.id
LEFT JOIN shop_order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.created_at, o.customer_name, o.customer_phone, 
         o.total_amount, o.pickup_date, o.payment_status, o.utm_source, o.utm_campaign,
         p.nickname, p.mbti_type;

CREATE OR REPLACE VIEW shop_daily_sales AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) as member_count,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_count
FROM shop_orders
WHERE payment_status IN ('confirmed', 'completed')
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW shop_product_performance AS
SELECT 
  oi.item_name,
  oi.item_spec,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue,
  AVG(oi.unit_price) as avg_price
FROM shop_order_items oi
JOIN shop_orders o ON oi.order_id = o.id
WHERE o.payment_status IN ('confirmed', 'completed')
GROUP BY oi.item_name, oi.item_spec
ORDER BY total_revenue DESC;

-- =============================================
-- 完成！
-- 表格清單：
-- - shop_profiles (主網站用戶)
-- - shop_orders (主網站訂單)
-- - shop_order_items (主網站訂單明細)
-- 
-- 與測試網頁的 orders/profiles 完全分開！
-- =============================================
