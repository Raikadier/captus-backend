-- ============================================================
-- CAPTUS — Admin Role Migration
-- Adds: institutions, grading_scales, academic_periods
-- Role 'admin' already exists in users.role enum via CHECK
-- Run once against the Supabase PostgreSQL instance
-- ============================================================

-- 1. Allow 'admin' as valid role value (if CHECK constraint exists)
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'admin'));

-- 2. Institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  country       TEXT,
  city          TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Link users to institutions (a user can belong to one institution)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

-- 4. Academic periods (semesters / terms)
CREATE TABLE IF NOT EXISTS public.academic_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,              -- e.g. "2026-I"
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link courses to academic periods
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS institution_id  UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_id       UUID REFERENCES public.academic_periods(id) ON DELETE SET NULL;

-- 5. Grading scales
CREATE TABLE IF NOT EXISTS public.grading_scales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,              -- e.g. "Escala numérica 0-5"
  min_passing     NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  max_score       NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grading_scale_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id        UUID NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,             -- e.g. "Excelente"
  min_value       NUMERIC(5,2) NOT NULL,
  max_value       NUMERIC(5,2) NOT NULL,
  color           TEXT DEFAULT '#22c55e'
);

-- Link courses to a grading scale
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS grading_scale_id UUID REFERENCES public.grading_scales(id) ON DELETE SET NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_users_institution      ON public.users(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution    ON public.courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_period         ON public.courses(period_id);
CREATE INDEX IF NOT EXISTS idx_periods_institution    ON public.academic_periods(institution_id);
CREATE INDEX IF NOT EXISTS idx_grading_institution    ON public.grading_scales(institution_id);

-- 7. RLS policies — institutions
ALTER TABLE public.institutions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_levels ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on their institution
CREATE POLICY "admin_manage_institution" ON public.institutions
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin' AND institution_id = institutions.id
    )
  );

CREATE POLICY "admin_manage_periods" ON public.academic_periods
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin' AND institution_id = academic_periods.institution_id
    )
  );

CREATE POLICY "members_read_periods" ON public.academic_periods
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND institution_id = academic_periods.institution_id
    )
  );

CREATE POLICY "admin_manage_grading" ON public.grading_scales
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin' AND institution_id = grading_scales.institution_id
    )
  );

CREATE POLICY "members_read_grading" ON public.grading_scales
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND institution_id = grading_scales.institution_id
    )
  );

CREATE POLICY "members_read_grading_levels" ON public.grading_scale_levels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_grading_levels" ON public.grading_scale_levels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grading_scales gs
      JOIN public.users u ON u.institution_id = gs.institution_id
      WHERE gs.id = grading_scale_levels.scale_id AND u.id = auth.uid() AND u.role = 'admin'
    )
  );
