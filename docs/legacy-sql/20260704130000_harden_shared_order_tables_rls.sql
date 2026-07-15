-- 歷史參考檔，不可從 Map 執行 migration。
-- 本變更曾於 2026-07-04 直接套用 production；後續 adoption、重播與
-- migration history 一律由 shop-kiwimu-com/supabase/migrations 統一管理。

-- ============================================================
-- 收斂 shop_orders / shop_order_items / special_eggs 的公開 SELECT 漏洞
-- ============================================================
-- 【已於 2026-07-04 直接透過 Supabase Management API 套用到線上】
-- 本檔案是事後補寫的歷史紀錄，不是「尚待套用」的檔案。
-- 線上這 3 張表原本各自有一條「Anyone can view ...」/
-- 「Anyone can update ...」的 always-true 公開讀寫 policy，任何人持 anon
-- key 都能撈全部訂單資料（shop_orders / shop_order_items）或竄改
-- special_eggs.claimed_count。
--
-- 2026-07-04 已用唯讀查詢核對線上 pg_policies，確認目前狀態：
--   shop_orders       只剩 INSERT "Anyone can insert shop orders"（保留）
--   shop_order_items  只剩 INSERT "Anyone can insert shop order items"（保留）
--   special_eggs      只剩 SELECT "Anyone can view special eggs"（保留，唯讀無個資）
-- 與本檔套用後的預期狀態一致。
-- ============================================================

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view shop orders" ON public.shop_orders;

ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view shop order items" ON public.shop_order_items;

ALTER TABLE public.special_eggs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can update claimed_count" ON public.special_eggs;

-- 驗證查詢：
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('shop_orders', 'shop_order_items', 'special_eggs')
-- ORDER BY tablename, cmd, policyname;
