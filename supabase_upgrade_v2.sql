-- ==========================================
-- 月島甜點店資料庫升級腳本 (Unified V2)
-- 功能：
-- 1. 新增「描述」欄位
-- 2. 建立「可讀性高」的價格表 (含產品名稱對照)
-- 3. 自動搬移資料
-- ==========================================

-- 1. 新增產品描述欄位 (Description)
alter table menu_items 
add column if not exists description text;

-- 2. 重建價格表 (Menu Variants)
-- 先刪除舊的以免衝突
drop table if exists menu_variants;

create table menu_variants (
  id uuid default gen_random_uuid() primary key,
  menu_item_id uuid references menu_items(id) on delete cascade,
  item_name_ref text, -- [新功能] 產品名稱快照 (方便後台對照用)
  spec text not null, -- 規格 (6吋, 200ml)
  price text not null, -- 價格 ($160)
  sort_order integer default 0
);

-- 3. 開放權限 (RLS)
alter table menu_variants enable row level security;
create policy "Public can view variants" 
  on menu_variants for select using (true);


-- 4. 智慧搬家 (Data Migration)
-- 把原本擠在 JSON 裡的價格拆出來，並且自動填入產品名稱
do $$
declare
    r record;
    p jsonb;
begin
    -- 遍歷所有非空的產品
    for r in select id, name, prices from menu_items where prices is not null loop
        -- 遍歷該產品的所有價格
        for p in select * from jsonb_array_elements(r.prices) loop
            insert into menu_variants (menu_item_id, item_name_ref, spec, price)
            values (r.id, r.name, p->>'spec', p->>'price');
        end loop;
    end loop;
end $$;

-- 5. 驗證是否成功
-- (執行後您應該會看到成功訊息，並且 Table Editor 裡會出現有名字的價格表)
