-- Migration: add_performance_indexes
-- Adds indexes on high-frequency query columns.
-- All use IF NOT EXISTS — fully safe to re-run.

-- tasks: buscar por usuario es la query más frecuente de la app
CREATE INDEX IF NOT EXISTS idx_tasks_user_id       ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date      ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed     ON public.tasks (completed);

-- events: dashboard y calendario cargan por usuario + fecha
CREATE INDEX IF NOT EXISTS idx_events_user_id      ON public.events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date   ON public.events (start_date);

-- notes: listado por usuario
CREATE INDEX IF NOT EXISTS idx_notes_user_id       ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned     ON public.notes (is_pinned);

-- courses: búsquedas por docente y por código de invitación
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id  ON public.courses (teacher_id);

-- course_enrollments: join frecuente para listar cursos de un estudiante
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.course_enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON public.course_enrollments (course_id);

-- notifications: bandeja de entrada (usuario + no leídas)
CREATE INDEX IF NOT EXISTS idx_notifs_user_id      ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_read         ON public.notifications (read);

-- messages: historial de conversaciones IA
CREATE INDEX IF NOT EXISTS idx_messages_conv_id    ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user  ON public.conversations (user_id);

-- assignment_submissions: entregas por estudiante
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions (student_id);

-- course_assignments: actividades por curso
CREATE INDEX IF NOT EXISTS idx_assignments_course  ON public.course_assignments (course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due     ON public.course_assignments (due_date);
