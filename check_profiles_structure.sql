-- =============================================
-- 檢查現有 profiles 表結構
-- =============================================
-- 請先執行這個查詢，確認 profiles 表的欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
