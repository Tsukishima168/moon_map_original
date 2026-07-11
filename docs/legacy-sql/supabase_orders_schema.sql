-- =============================================
-- CRM Phase 1: Orders & Order Items Tables
-- =============================================
-- Purpose: Store order data for CRM and analytics
-- Author: Antigravity AI
-- Date: 2026-01-27
-- =============================================

-- 1. CREATE ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  -- Basic Information
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Customer Information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Order Details
  total_amount INTEGER NOT NULL,
  pickup_date DATE NOT NULL,
  order_note TEXT,
  
  -- Payment & Status
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_last_5_digits TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  
  -- Source Tracking (for Marketing Analytics)
  source TEXT DEFAULT 'website',
  ga_client_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX IF NOT EXISTS idx_orders_ga_client_id ON orders(ga_client_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();

-- 2. CREATE ORDER_ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Item Details
  item_name TEXT NOT NULL,
  item_spec TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_name ON order_items(item_name);

-- 3. ENHANCE PROFILES TABLE (OPTIONAL)
-- =============================================
-- Add order statistics to profiles for quick CRM insights
-- NOTE: Uncomment these lines if your profiles table doesn't have these columns yet
-- If you get errors, it means the columns already exist or the table structure is different

-- ALTER TABLE profiles 
-- ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
-- ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0,
-- ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ,
-- ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ,
-- ADD COLUMN IF NOT EXISTS favorite_items JSONB;

-- 4. CREATE FUNCTION TO UPDATE PROFILE STATS
-- =============================================
-- Automatically update profile stats when order is confirmed
CREATE OR REPLACE FUNCTION update_profile_stats_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if order is confirmed and user_id exists
  -- Note: We check if profiles table exists and has the user
  IF NEW.payment_status = 'confirmed' AND NEW.user_id IS NOT NULL THEN
    -- Try to update profiles if it exists
    UPDATE profiles
    SET 
      total_orders = COALESCE(total_orders, 0) + 1,
      total_spent = COALESCE(total_spent, 0) + NEW.total_amount,
      last_order_at = NEW.created_at,
      first_order_at = COALESCE(first_order_at, NEW.created_at)
    WHERE id = NEW.user_id;
    
    -- If no row was updated (profile doesn't exist), that's okay
    -- The trigger won't fail
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_confirmed
AFTER INSERT OR UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_profile_stats_on_order();

-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Anyone can insert orders (for guest checkout)
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own order items
CREATE POLICY "Users can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Policy: Anyone can insert order items (for guest checkout)
CREATE POLICY "Anyone can create order items"
ON order_items FOR INSERT
WITH CHECK (true);

-- 6. HELPER VIEWS FOR ANALYTICS
-- =============================================

-- View: Order Summary with Items
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
GROUP BY o.id, p.nickname, p.mbti_type;

-- View: Daily Sales Summary
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

-- View: Product Performance
CREATE OR REPLACE VIEW product_performance AS
SELECT 
  oi.item_name,
  oi.item_spec,
  COUNT(*) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue,
  AVG(oi.unit_price) as avg_price
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.payment_status IN ('confirmed', 'completed')
GROUP BY oi.item_name, oi.item_spec
ORDER BY total_revenue DESC;

-- =============================================
-- COMPLETE! 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Update frontend to save orders
-- 3. Test the flow
-- =============================================
