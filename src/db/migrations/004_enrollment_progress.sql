-- Progreso del estudiante por curso (0-100)
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0
  CHECK (progress >= 0 AND progress <= 100);

CREATE INDEX IF NOT EXISTS idx_enrollments_progress
  ON public.course_enrollments (student_id, progress);
