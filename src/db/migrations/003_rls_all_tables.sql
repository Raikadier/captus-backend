-- =============================================================================
-- Migration 003 — Enable RLS on all unprotected tables (idempotent)
-- Applied: 2026-05-04
-- Scope: Supabase client-side access (anon/authenticated roles).
-- The backend uses service_role_key which bypasses ALL policies below.
-- =============================================================================

-- ── 1. users ──────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid());

-- ── 2. categories ─────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_own" ON public.categories;
CREATE POLICY "categories_own" ON public.categories FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 3. priorities (lookup) ────────────────────────────────────────────────────
ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "priorities_read_all" ON public.priorities;
CREATE POLICY "priorities_read_all" ON public.priorities FOR SELECT TO authenticated USING (true);

-- ── 4. tasks ──────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_own" ON public.tasks;
CREATE POLICY "tasks_own" ON public.tasks FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 5. subTask (uses quoted "id_Task" column name) ────────────────────────────
ALTER TABLE public."subTask" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subtasks_own" ON public."subTask";
CREATE POLICY "subtasks_own" ON public."subTask"
  FOR ALL TO authenticated
  USING (
    "id_Task" IS NULL
    OR "id_Task" IN (SELECT id FROM public.tasks WHERE user_id = auth.uid())
  );

-- ── 6. documents ──────────────────────────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_own" ON public.documents;
CREATE POLICY "documents_own" ON public.documents FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 7. statistics (uses quoted "id_User") ────────────────────────────────────
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "statistics_own" ON public.statistics;
CREATE POLICY "statistics_own" ON public.statistics
  FOR ALL TO authenticated USING ("id_User" = auth.uid());

-- ── 8. userAchievements (uses quoted "id_User") ───────────────────────────────
ALTER TABLE public."userAchievements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_own" ON public."userAchievements";
CREATE POLICY "achievements_own" ON public."userAchievements"
  FOR ALL TO authenticated USING ("id_User" = auth.uid());

-- ── 9. conversations ──────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_own" ON public.conversations;
CREATE POLICY "conversations_own" ON public.conversations FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 10. messages (through owned conversations) ────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_own" ON public.messages;
CREATE POLICY "messages_own" ON public.messages
  FOR ALL TO authenticated
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));

-- ── 11. notification_preferences ─────────────────────────────────────────────
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_prefs_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_own" ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 12. notification_logs ─────────────────────────────────────────────────────
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_logs_own" ON public.notification_logs;
CREATE POLICY "notif_logs_own" ON public.notification_logs FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 13. telegram_link_codes ───────────────────────────────────────────────────
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "telegram_codes_own" ON public.telegram_link_codes;
CREATE POLICY "telegram_codes_own" ON public.telegram_link_codes FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── 14. groups ────────────────────────────────────────────────────────────────
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_creator" ON public.groups;
DROP POLICY IF EXISTS "groups_member"  ON public.groups;
CREATE POLICY "groups_creator" ON public.groups FOR ALL  TO authenticated USING (created_by = auth.uid());
CREATE POLICY "groups_member"  ON public.groups FOR SELECT TO authenticated
  USING (id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

-- ── 15. group_members ─────────────────────────────────────────────────────────
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_own"          ON public.group_members;
DROP POLICY IF EXISTS "group_members_creator_view" ON public.group_members;
CREATE POLICY "group_members_own" ON public.group_members FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "group_members_creator_view" ON public.group_members FOR SELECT TO authenticated
  USING (group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()));

-- ── 16. courses ───────────────────────────────────────────────────────────────
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_enrolled_or_teacher" ON public.courses;
CREATE POLICY "courses_enrolled_or_teacher" ON public.courses FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR id IN (SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid())
  );

-- ── 17. course_enrollments ────────────────────────────────────────────────────
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_student_own"  ON public.course_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_view" ON public.course_enrollments;
CREATE POLICY "enrollments_student_own" ON public.course_enrollments FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "enrollments_teacher_view" ON public.course_enrollments FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid()));

-- ── 18. course_groups ─────────────────────────────────────────────────────────
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_groups_course_member" ON public.course_groups;
CREATE POLICY "course_groups_course_member" ON public.course_groups FOR SELECT TO authenticated
  USING (
    course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
      UNION
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- ── 19. course_group_members ──────────────────────────────────────────────────
ALTER TABLE public.course_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_group_members_view" ON public.course_group_members;
CREATE POLICY "course_group_members_view" ON public.course_group_members FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.course_groups WHERE course_id IN (
        SELECT id FROM public.courses WHERE teacher_id = auth.uid()
      )
    )
  );

-- ── 20. course_assignments ────────────────────────────────────────────────────
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_course_member" ON public.course_assignments;
CREATE POLICY "assignments_course_member" ON public.course_assignments FOR SELECT TO authenticated
  USING (
    course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
      UNION
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- ── 21. assignment_submissions ────────────────────────────────────────────────
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_student_own"  ON public.assignment_submissions;
DROP POLICY IF EXISTS "submissions_teacher_view" ON public.assignment_submissions;
CREATE POLICY "submissions_student_own" ON public.assignment_submissions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "submissions_teacher_view" ON public.assignment_submissions FOR SELECT TO authenticated
  USING (
    assignment_id IN (
      SELECT id FROM public.course_assignments WHERE course_id IN (
        SELECT id FROM public.courses WHERE teacher_id = auth.uid()
      )
    )
  );

-- ── 22. project (legacy) ──────────────────────────────────────────────────────
ALTER TABLE public.project ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_creator"     ON public.project;
DROP POLICY IF EXISTS "project_member_view" ON public.project;
CREATE POLICY "project_creator" ON public.project FOR ALL TO authenticated USING ("id_Creator" = auth.uid());
CREATE POLICY "project_member_view" ON public.project FOR SELECT TO authenticated
  USING ("id_Project" IN (SELECT "id_Project" FROM public."projectMember" WHERE "id_User" = auth.uid()));

-- ── 23. rol (lookup) ──────────────────────────────────────────────────────────
ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rol_read_all" ON public.rol;
CREATE POLICY "rol_read_all" ON public.rol FOR SELECT TO authenticated USING (true);

-- ── 24. projectMember (legacy) ────────────────────────────────────────────────
ALTER TABLE public."projectMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_member_own_view" ON public."projectMember";
CREATE POLICY "project_member_own_view" ON public."projectMember" FOR SELECT TO authenticated
  USING (
    "id_User" = auth.uid()
    OR "id_Project" IN (SELECT "id_Project" FROM public."projectMember" WHERE "id_User" = auth.uid())
  );

-- ── 25. projectComment (legacy) ───────────────────────────────────────────────
ALTER TABLE public."projectComment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_comment_member_view" ON public."projectComment";
CREATE POLICY "project_comment_member_view" ON public."projectComment" FOR SELECT TO authenticated
  USING (
    "id_User" = auth.uid()
    OR "id_Project" IN (SELECT "id_Project" FROM public."projectMember" WHERE "id_User" = auth.uid())
  );

-- ── 26. commentLike (legacy) ──────────────────────────────────────────────────
ALTER TABLE public."commentLike" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comment_like_own" ON public."commentLike";
CREATE POLICY "comment_like_own" ON public."commentLike" FOR ALL TO authenticated USING ("id_User" = auth.uid());
