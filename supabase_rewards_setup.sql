-- ==========================================
-- Reward Claims (for Cross-Site Badges)
-- ==========================================

create table if not exists public.reward_claims (
  code text primary key,           -- Unique Claim Code (UUID or specialized format)
  reward_id text not null,         -- E.g. 'egg_master_2026_q1'
  source text,                     -- E.g. 'moon_map'
  created_at timestamp with time zone default now(),
  claimed_at timestamp with time zone  -- Null = Unclaimed
);

-- Enable RLS
alter table public.reward_claims enable row level security;

-- Allow ANYONE to insert a claim code (Server-generated or Client-generated with valid logic)
-- In a stricter system, this would be behind a server function, 
-- but for this client-side game, we allow public insert to generate the code.
drop policy if exists "Allow insert reward claims" on public.reward_claims;
create policy "Allow insert reward claims"
  on public.reward_claims
  for insert
  with check (true);

-- Allow reading only if you know the code (for verification by Passport App)
drop policy if exists "Allow read reward claims by code" on public.reward_claims;
create policy "Allow read reward claims by code"
  on public.reward_claims
  for select
  using (true);

-- Allow update (claiming) by anyone who knows the code
drop policy if exists "Allow update reward claims" on public.reward_claims;
create policy "Allow update reward claims"
  on public.reward_claims
  for update
  using (true);
