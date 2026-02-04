-- ==========================================
-- MBTI Claim Codes (for Passport stamp)
-- ==========================================

create table if not exists public.mbti_claims (
  code text primary key,
  mbti_type text not null,
  variant text not null check (variant in ('A', 'T')),
  source text,
  created_at timestamp with time zone default now(),
  used_at timestamp with time zone
);

alter table public.mbti_claims enable row level security;

-- Allow anyone to create a claim (anon insert)
drop policy if exists "Allow insert mbti claims" on public.mbti_claims;
create policy "Allow insert mbti claims"
  on public.mbti_claims
  for insert
  with check (true);

-- Secure consume: one-time use via RPC (no direct select needed)
create or replace function public.consume_mbti_claim(p_code text)
returns table (mbti_type text, variant text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.mbti_claims
  set used_at = now()
  where code = p_code
    and used_at is null
  returning mbti_type, variant;
end;
$$;

grant execute on function public.consume_mbti_claim(text) to anon, authenticated;
