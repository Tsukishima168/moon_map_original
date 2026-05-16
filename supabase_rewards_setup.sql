-- ==========================================
-- Reward Claims (for Cross-Site Badges)
-- ==========================================
-- Claims are issued by trusted server endpoints and consumed by Passport.
-- Public clients must not insert, read, or patch reward_claims directly.

CREATE TABLE IF NOT EXISTS public.reward_claims (
  code TEXT,
  reward_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.reward_claims
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS reward_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.reward_claims
SET created_at = now()
WHERE created_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.reward_claims
    WHERE code IS NULL OR char_length(btrim(code)) < 16
  ) THEN
    RAISE EXCEPTION 'reward_claims.code must be non-null and at least 16 trimmed characters before enabling public RPC consumption';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reward_claims
    WHERE reward_id IS NULL OR char_length(btrim(reward_id)) = 0
  ) THEN
    RAISE EXCEPTION 'reward_claims.reward_id must be non-null and non-blank before enabling public RPC consumption';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reward_claims
    GROUP BY code
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'reward_claims.code contains duplicates; resolve before enabling public RPC consumption';
  END IF;
END;
$$;

ALTER TABLE public.reward_claims
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN reward_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
DECLARE
  v_pk_columns TEXT[];
BEGIN
  SELECT array_agg(a.attname ORDER BY k.ordinality)
  INTO v_pk_columns
  FROM pg_constraint c
  JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
  WHERE c.conrelid = 'public.reward_claims'::regclass
    AND c.contype = 'p';

  IF v_pk_columns IS NULL THEN
    ALTER TABLE public.reward_claims
      ADD CONSTRAINT reward_claims_pkey PRIMARY KEY (code);
  ELSIF v_pk_columns <> ARRAY['code']::TEXT[] THEN
    RAISE EXCEPTION 'reward_claims primary key must be code, found %', v_pk_columns;
  END IF;
END;
$$;

ALTER TABLE public.reward_claims
  DROP CONSTRAINT IF EXISTS reward_claims_code_entropy_check,
  DROP CONSTRAINT IF EXISTS reward_claims_reward_id_nonblank_check,
  ADD CONSTRAINT reward_claims_code_entropy_check
    CHECK (char_length(btrim(code)) >= 16),
  ADD CONSTRAINT reward_claims_reward_id_nonblank_check
    CHECK (char_length(btrim(reward_id)) > 0);

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert reward claims" ON public.reward_claims;
DROP POLICY IF EXISTS "Allow read reward claims by code" ON public.reward_claims;
DROP POLICY IF EXISTS "Allow update reward claims" ON public.reward_claims;
DROP POLICY IF EXISTS reward_claims_public_insert ON public.reward_claims;
DROP POLICY IF EXISTS reward_claims_public_select ON public.reward_claims;
DROP POLICY IF EXISTS reward_claims_public_update ON public.reward_claims;

REVOKE ALL ON TABLE public.reward_claims FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.reward_claim_progress (
  user_id UUID NOT NULL,
  reward_id TEXT NOT NULL,
  proof_key TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_id, proof_key)
);

ALTER TABLE public.reward_claim_progress
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS reward_id TEXT,
  ADD COLUMN IF NOT EXISTS proof_key TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.reward_claim_progress
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.reward_claim_progress
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN reward_id SET NOT NULL,
  ALTER COLUMN proof_key SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
DECLARE
  v_pk_columns TEXT[];
BEGIN
  SELECT array_agg(a.attname ORDER BY k.ordinality)
  INTO v_pk_columns
  FROM pg_constraint c
  JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
  WHERE c.conrelid = 'public.reward_claim_progress'::regclass
    AND c.contype = 'p';

  IF v_pk_columns IS NULL THEN
    ALTER TABLE public.reward_claim_progress
      ADD CONSTRAINT reward_claim_progress_pkey PRIMARY KEY (user_id, reward_id, proof_key);
  ELSIF v_pk_columns <> ARRAY['user_id', 'reward_id', 'proof_key']::TEXT[] THEN
    RAISE EXCEPTION 'reward_claim_progress primary key must be user_id,reward_id,proof_key, found %', v_pk_columns;
  END IF;
END;
$$;

ALTER TABLE public.reward_claim_progress
  DROP CONSTRAINT IF EXISTS reward_claim_progress_reward_id_nonblank_check,
  DROP CONSTRAINT IF EXISTS reward_claim_progress_proof_key_nonblank_check,
  ADD CONSTRAINT reward_claim_progress_reward_id_nonblank_check
    CHECK (char_length(btrim(reward_id)) > 0),
  ADD CONSTRAINT reward_claim_progress_proof_key_nonblank_check
    CHECK (char_length(btrim(proof_key)) > 0);

ALTER TABLE public.reward_claim_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_claim_progress_public_insert ON public.reward_claim_progress;
DROP POLICY IF EXISTS reward_claim_progress_public_select ON public.reward_claim_progress;
DROP POLICY IF EXISTS reward_claim_progress_public_update ON public.reward_claim_progress;

REVOKE ALL ON TABLE public.reward_claim_progress FROM anon, authenticated;

drop policy if exists "Allow insert reward claims" on public.reward_claims;
drop policy if exists "Allow read reward claims by code" on public.reward_claims;
drop policy if exists "Allow update reward claims" on public.reward_claims;

create or replace function public.consume_reward_claim(
  p_code text,
  p_reward_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward_id text;
begin
  update public.reward_claims
  set claimed_at = now()
  where code = trim(p_code)
    and reward_id = trim(p_reward_id)
    and claimed_at is null
    and (expires_at is null or expires_at > now())
  returning reward_id into v_reward_id;

  if v_reward_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_used');
  end if;

  return jsonb_build_object('ok', true, 'reward_id', v_reward_id);
end;
$$;

revoke all on function public.consume_reward_claim(text, text) from public;
grant execute on function public.consume_reward_claim(text, text) to anon, authenticated;
