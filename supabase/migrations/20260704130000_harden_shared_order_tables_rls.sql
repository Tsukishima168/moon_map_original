-- ============================================================
-- 收斂 shop_orders / shop_order_items / special_eggs 的公開 SELECT 漏洞
-- ============================================================
-- 【已於 2026-07-04 直接透過 Supabase Management API 套用到線上】
-- 本檔案是事後補寫的正式 migration 紀錄（repo = prod 對齊用），
-- 不是「尚待套用」的檔案。線上這 3 張表原本各自有一條
-- 「Anyone can view ...」/「Anyone can update ...」的 always-true
-- 公開讀寫 policy，任何人持 anon key 都能撈全部訂單資料
-- （shop_orders / shop_order_items）或竄改 special_eggs.claimed_count。
--
-- 2026-07-04 已用唯讀查詢核對線上 pg_policies，確認目前狀態：
--   shop_orders       只剩 INSERT "Anyone can insert shop orders"（保留）
--   shop_order_items  只剩 INSERT "Anyone can insert shop order items"（保留）
--   special_eggs      只剩 SELECT "Anyone can view special eggs"（保留，唯讀無個資）
-- 與本檔套用後的預期狀態一致。
--
-- 本檔全數使用 DROP POLICY IF EXISTS，重複執行不會出錯，可安全
-- 再次 apply 作為對齊確認（idempotent）。
-- ============================================================

-- ------------------------------------------------------------
-- shop_orders：移除公開 SELECT（曾允許任何人讀取全部訂單個資）
-- ------------------------------------------------------------
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view shop orders" ON public.shop_orders;

-- 保留：Anyone can insert shop orders（結帳流程需要匿名寫入，不動）

-- ------------------------------------------------------------
-- shop_order_items：移除公開 SELECT（曾允許任何人讀取訂單品項明細）
-- ------------------------------------------------------------
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view shop order items" ON public.shop_order_items;

-- 保留：Anyone can insert shop order items（結帳流程需要匿名寫入，不動）

-- ------------------------------------------------------------
-- special_eggs：移除公開 UPDATE（曾允許任何人竄改 claimed_count）
-- ------------------------------------------------------------
ALTER TABLE public.special_eggs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can update claimed_count" ON public.special_eggs;

-- 保留：Anyone can view special eggs（唯讀、無個資，不動）

-- ============================================================
-- 【驗證查詢（套用後執行，確認與預期一致）】
-- ============================================================
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('shop_orders', 'shop_order_items', 'special_eggs')
-- ORDER BY tablename, cmd, policyname;
--
-- 預期：
--   shop_orders       / INSERT / Anyone can insert shop orders
--   shop_order_items  / INSERT / Anyone can insert shop order items
--   special_eggs      / SELECT / Anyone can view special eggs
-- 不應再有任何公開 SELECT（shop_orders / shop_order_items）
-- 或公開 UPDATE（special_eggs）policy。
