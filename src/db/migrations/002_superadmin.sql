-- =============================================================================
-- Migration 002 — Superadmin & Multi-Tenancy Hardening
-- Run this against your Supabase project SQL editor.
-- Safe to re-run: all statements are idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add 'superadmin' to the role CHECK constraint on public.users
--    Current: CHECK (role = ANY (ARRAY['student','teacher','admin']))
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['student','teacher','admin','superadmin']));

-- ---------------------------------------------------------------------------
-- 2. Add 'superadmin' to the role CHECK constraint on public.profiles
--    Current: CHECK (role = ANY (ARRAY['student','teacher','admin']))
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', con_name);
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role = ANY (ARRAY['student','teacher','admin','superadmin']));
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Fix institutions.created_by FK: auth.users → public.users
--    The original FK pointed to auth.users(id), which prevents PostgREST
--    from joining to public.users (name, email).
--    Since public.users.id mirrors auth.users.id, this is safe to change.
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions
  DROP CONSTRAINT IF EXISTS institutions_created_by_fkey;

ALTER TABLE public.institutions
  ADD CONSTRAINT institutions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. Add soft-disable columns to institutions
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN     NOT NULL DEFAULT true;

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS disabled_at     TIMESTAMPTZ;

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- ---------------------------------------------------------------------------
-- 5. Superadmin audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.superadmin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  target_type TEXT        NOT NULL,
  target_id   UUID,
  payload     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON public.superadmin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target     ON public.superadmin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.superadmin_audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Performance indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_institutions_is_active  ON public.institutions(is_active);
CREATE INDEX IF NOT EXISTS idx_institutions_created_at ON public.institutions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_institution_role  ON public.users(institution_id, role);

-- ---------------------------------------------------------------------------
-- 7. RLS — protect Supabase dashboard / direct API access
--    (Backend uses service_role_key which bypasses RLS;
--     these protect against anon/authenticated key misuse)
-- ---------------------------------------------------------------------------

ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_only" ON public.superadmin_audit_log;
CREATE POLICY "superadmin_only"
  ON public.superadmin_audit_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institutions_superadmin" ON public.institutions;
DROP POLICY IF EXISTS "institutions_own_tenant"  ON public.institutions;

CREATE POLICY "institutions_superadmin"
  ON public.institutions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "institutions_own_tenant"
  ON public.institutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND institution_id = institutions.id
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Helper function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- =============================================================================
-- HOW TO CREATE THE FIRST SUPERADMIN
-- =============================================================================
-- 1. Make sure the user is registered in the app first.
-- 2. Run:
--      UPDATE public.users
--      SET    role = 'superadmin'
--      WHERE  email = 'su_email@dominio.com';
-- =============================================================================
