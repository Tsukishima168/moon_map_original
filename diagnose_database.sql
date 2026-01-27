-- =============================================
-- 診斷腳本：檢查現有資料庫結構
-- =============================================
-- 請在 Supabase SQL Editor 執行這些查詢，並把結果貼給我

-- 1. 檢查所有現有的表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. 檢查 profiles 表結構（如果存在）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 檢查 orders 表是否已存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'orders';

-- 4. 如果 orders 表已存在，查看其結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. 檢查 auth.users 表的主鍵
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'id';
