-- ==========================================
-- 月島品牌大一統：用戶資料表 (Profiles Table)
-- ==========================================

-- 1. 建立 profiles 表格，用來存暱稱、MBTI 等額外資訊
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  nickname text,
  mbti_type text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 開啟 RLS 安全設定
alter table public.profiles enable row level security;

-- 3. 設定安全策略 (Policies)
-- 所有人都可以讀取 Profile (為了顯示暱稱)
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" 
  on profiles for select using (true);

-- 用戶只能修改自己的 Profile
drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" 
  on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" 
  on profiles for update using (auth.uid() = id);

-- 4. 自動化：當有新用戶註冊 (透過 Google/Email) 時，自動建立 Profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', -- 抓取 Google 的全名
    new.raw_user_meta_data->>'avatar_url' -- 抓取 Google 的大頭貼
  );
  return new;
end;
$$ language plpgsql security definer;

-- 綁定觸發器
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
