-- Optional additive schema for site-specific menu display config.
-- Safe rollout rule:
-- 1. Create these tables in Supabase.
-- 2. Backfill data for `site_key = 'map'`.
-- 3. Keep ENABLE_SUPABASE_MENU_DISPLAY_CONFIG disabled until data is verified.
-- 4. Enable the flag only after /api/menu parity is confirmed.
--
-- This migration does NOT touch auth, SSO, profiles, checkout, or canonical menu tables.

create table if not exists site_category_configs (
  id uuid primary key default gen_random_uuid(),
  site_key text not null,
  category_id text not null references menu_categories(id) on delete cascade,
  title text,
  subtitle text,
  hide_price boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_key, category_id)
);

create table if not exists site_item_configs (
  id uuid primary key default gen_random_uuid(),
  site_key text not null,
  category_id text not null references menu_categories(id) on delete cascade,
  item_key text,
  item_name text not null,
  description_override text,
  image_override text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_category_configs_site_key
  on site_category_configs(site_key, sort_order);

create index if not exists idx_site_item_configs_site_key
  on site_item_configs(site_key, category_id, sort_order);

create or replace function update_site_display_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_category_configs_updated_at on site_category_configs;
create trigger site_category_configs_updated_at
before update on site_category_configs
for each row
execute function update_site_display_configs_updated_at();

drop trigger if exists site_item_configs_updated_at on site_item_configs;
create trigger site_item_configs_updated_at
before update on site_item_configs
for each row
execute function update_site_display_configs_updated_at();

alter table site_category_configs enable row level security;
alter table site_item_configs enable row level security;

drop policy if exists site_category_configs_public_read on site_category_configs;
create policy site_category_configs_public_read
  on site_category_configs for select using (true);

drop policy if exists site_item_configs_public_read on site_item_configs;
create policy site_item_configs_public_read
  on site_item_configs for select using (true);

-- Seed SQL can be generated from current public/menu.json via:
-- node scripts/generate-menu-display-config-seed.js > /tmp/menu-display-config-seed.sql
