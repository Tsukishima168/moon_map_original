-- ==========================================
-- 月島甜點店：自動同步名字腳本 (Auto Sync Triggers)
-- ==========================================

-- 1. 建立功能：當「主檔 (Item)」改名時，自動去改「價格表 (Variant)」的名字
create or replace function propagate_menu_item_name_change()
returns trigger as $$
begin
  -- 如果名字有變動
  if new.name <> old.name then
    update menu_variants
    set item_name_ref = new.name
    where menu_item_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

-- 2. 綁定觸發器：綁在 menu_items 表格上
drop trigger if exists on_menu_item_name_update on menu_items;
create trigger on_menu_item_name_update
after update on menu_items
for each row
execute function propagate_menu_item_name_change();


-- 3. 建立功能：當「新增價格 (Variant)」時，自動去抓主檔的名字填入
create or replace function fill_variant_item_name()
returns trigger as $$
begin
  -- 只有當 item_name_ref 是空的，才去抓
  if new.item_name_ref is null then
    select name into new.item_name_ref
    from menu_items
    where id = new.menu_item_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- 4. 綁定觸發器：綁在 menu_variants 表格上
drop trigger if exists on_variant_insert on menu_variants;
create trigger on_variant_insert
before insert on menu_variants
for each row
execute function fill_variant_item_name();

-- 5. (可選) 執行一次強制全域同步，確保現在的資料是對的
update menu_variants v
set item_name_ref = i.name
from menu_items i
where v.menu_item_id = i.id
and v.item_name_ref <> i.name;
