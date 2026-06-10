-- AI agent: complexity, estimated_hours, and course materials for RAG-lite search

-- Personal tasks: advisory scoring fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS complexity integer NOT NULL DEFAULT 3
    CHECK (complexity >= 1 AND complexity <= 5),
  ADD COLUMN IF NOT EXISTS estimated_hours numeric(6,2) NOT NULL DEFAULT 1.0
    CHECK (estimated_hours > 0);

-- Course assignments: advisory scoring fields
ALTER TABLE public.course_assignments
  ADD COLUMN IF NOT EXISTS complexity integer NOT NULL DEFAULT 3
    CHECK (complexity >= 1 AND complexity <= 5),
  ADD COLUMN IF NOT EXISTS estimated_hours numeric(6,2) NOT NULL DEFAULT 2.0
    CHECK (estimated_hours > 0);

-- Course-shared materials for AI content retrieval
CREATE SEQUENCE IF NOT EXISTS course_materials_id_seq;

CREATE TABLE IF NOT EXISTS public.course_materials (
  id integer NOT NULL DEFAULT nextval('course_materials_id_seq'::regclass),
  course_id integer NOT NULL,
  title character varying NOT NULL,
  content text,
  file_path character varying,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_materials_pkey PRIMARY KEY (id),
  CONSTRAINT course_materials_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT course_materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_title ON public.course_materials USING gin(to_tsvector('spanish', coalesce(title, '')));
CREATE INDEX IF NOT EXISTS idx_course_materials_content ON public.course_materials USING gin(to_tsvector('spanish', coalesce(content, '')));
