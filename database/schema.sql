-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assignment_submissions (
  id integer NOT NULL DEFAULT nextval('assignment_submissions_id_seq'::regclass),
  assignment_id integer NOT NULL,
  student_id uuid,
  group_id integer,
  file_url text,
  submitted_at timestamp with time zone DEFAULT now(),
  graded boolean DEFAULT false,
  grade numeric,
  feedback text,
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.course_assignments(id),
  CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT assignment_submissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.course_groups(id)
);
CREATE TABLE public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name character varying NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.commentLike (
  id_Like integer NOT NULL DEFAULT nextval('"CommentLike_id_Like_seq"'::regclass),
  id_Comment integer NOT NULL,
  createdAt timestamp with time zone,
  id_User uuid NOT NULL,
  CONSTRAINT commentLike_pkey PRIMARY KEY (id_Like),
  CONSTRAINT CommentLike_id_Comment_fkey FOREIGN KEY (id_Comment) REFERENCES public.projectComment(id_Comment),
  CONSTRAINT commentLike_id_User_fkey FOREIGN KEY (id_User) REFERENCES public.users(id)
);
CREATE TABLE public.conversations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.course_assignments (
  id integer NOT NULL DEFAULT nextval('course_assignments_id_seq'::regclass),
  course_id integer NOT NULL,
  title character varying NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  is_group_assignment boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT course_assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_enrollments (
  id integer NOT NULL DEFAULT nextval('course_enrollments_id_seq'::regclass),
  course_id integer NOT NULL,
  student_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);
CREATE TABLE public.course_group_members (
  id integer NOT NULL DEFAULT nextval('course_group_members_id_seq'::regclass),
  group_id integer NOT NULL,
  student_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_group_members_pkey PRIMARY KEY (id),
  CONSTRAINT course_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.course_groups(id),
  CONSTRAINT course_group_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);
CREATE TABLE public.course_groups (
  id integer NOT NULL DEFAULT nextval('course_groups_id_seq'::regclass),
  course_id integer NOT NULL,
  name character varying NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_groups_pkey PRIMARY KEY (id),
  CONSTRAINT course_groups_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.courses (
  id integer NOT NULL DEFAULT nextval('courses_id_seq'::regclass),
  teacher_id uuid NOT NULL,
  subject_id integer,
  title character varying NOT NULL,
  description text,
  invite_code character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id),
  CONSTRAINT courses_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.diagrams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id integer,
  title text NOT NULL,
  code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT diagrams_pkey PRIMARY KEY (id),
  CONSTRAINT diagrams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT diagrams_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.documents (
  id integer NOT NULL DEFAULT nextval('documents_id_seq'::regclass),
  title character varying NOT NULL,
  content text,
  file_path character varying,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.events (
  id integer NOT NULL DEFAULT nextval('events_id_seq'::regclass),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  type character varying NOT NULL,
  is_past boolean NOT NULL,
  notify boolean NOT NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.group_members (
  id integer NOT NULL DEFAULT nextval('group_members_id_seq'::regclass),
  group_id integer,
  user_id uuid,
  role character varying DEFAULT 'member'::character varying,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.groups (
  id integer NOT NULL DEFAULT nextval('groups_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  conversation_id bigint,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.notes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  update_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  title character varying NOT NULL,
  content text,
  subject character varying,
  is_pinned boolean NOT NULL,
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_id text,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT false,
  email text,
  whatsapp text,
  quiet_hours jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text DEFAULT 'task'::text CHECK (type = ANY (ARRAY['task'::text, 'system'::text, 'reminder'::text, 'academic'::text])),
  created_at timestamp with time zone DEFAULT now(),
  read boolean DEFAULT false,
  related_task uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  event_type text,
  entity_id text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.priorities (
  id integer NOT NULL DEFAULT nextval('priorities_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  CONSTRAINT priorities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.project (
  id_Project integer NOT NULL DEFAULT nextval('"Project_id_Project_seq"'::regclass),
  name character varying NOT NULL UNIQUE,
  description character varying,
  createdAt timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  id_Creator uuid NOT NULL,
  CONSTRAINT project_pkey PRIMARY KEY (id_Project),
  CONSTRAINT project_id_Creator_fkey FOREIGN KEY (id_Creator) REFERENCES public.users(id)
);
CREATE TABLE public.projectComment (
  id_Comment integer NOT NULL DEFAULT nextval('"ProjectComment_id_Comment_seq"'::regclass),
  id_Project integer NOT NULL,
  id_ParentComment integer NOT NULL,
  content character varying NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  id_User uuid NOT NULL,
  CONSTRAINT projectComment_pkey PRIMARY KEY (id_Comment),
  CONSTRAINT ProjectComment_id_Project_fkey FOREIGN KEY (id_Project) REFERENCES public.project(id_Project),
  CONSTRAINT ProjectComment_id_ParentComment_fkey FOREIGN KEY (id_ParentComment) REFERENCES public.projectComment(id_Comment),
  CONSTRAINT ProjectComment_id_User_fkey FOREIGN KEY (id_User) REFERENCES public.users(id)
);
CREATE TABLE public.projectMember (
  id_ProjectMember integer NOT NULL DEFAULT nextval('"ProjectMember_id_ProjectMember_seq"'::regclass),
  id_Project integer NOT NULL,
  id_Rol integer NOT NULL,
  id_User uuid NOT NULL,
  CONSTRAINT projectMember_pkey PRIMARY KEY (id_ProjectMember),
  CONSTRAINT ProjectMember_id_Project_fkey FOREIGN KEY (id_Project) REFERENCES public.project(id_Project),
  CONSTRAINT ProjectMember_id_Rol_fkey FOREIGN KEY (id_Rol) REFERENCES public.rol(id_Rol),
  CONSTRAINT projectMember_id_User_fkey FOREIGN KEY (id_User) REFERENCES public.users(id)
);
CREATE TABLE public.rol (
  id_Rol integer NOT NULL DEFAULT nextval('"Rol_id_Rol_seq"'::regclass),
  name character varying NOT NULL UNIQUE,
  description character varying,
  CONSTRAINT rol_pkey PRIMARY KEY (id_Rol)
);
CREATE TABLE public.statistics (
  id_Statistics integer NOT NULL DEFAULT nextval('"Statistics_id_Statistics_seq"'::regclass),
  startDate timestamp with time zone NOT NULL,
  endDate timestamp with time zone,
  lastRachaDate timestamp with time zone,
  racha integer NOT NULL DEFAULT 0,
  totalTasks integer NOT NULL DEFAULT 0,
  completedTasks integer NOT NULL DEFAULT 0,
  dailyGoal integer NOT NULL DEFAULT 5,
  bestStreak integer NOT NULL DEFAULT 0,
  favoriteCategory integer,
  id_User uuid NOT NULL,
  CONSTRAINT statistics_pkey PRIMARY KEY (id_Statistics),
  CONSTRAINT Statistics_id_User_fkey FOREIGN KEY (id_User) REFERENCES public.users(id),
  CONSTRAINT Statistics_favoriteCategory_fkey FOREIGN KEY (favoriteCategory) REFERENCES public.categories(id)
);
CREATE TABLE public.study_sessions (
  id integer NOT NULL DEFAULT nextval('study_sessions_id_seq'::regclass),
  user_id uuid NOT NULL,
  subject_id integer,
  duration_minutes integer NOT NULL DEFAULT 0,
  session_date timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT study_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT study_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.subTask (
  id_SubTask integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  title character varying NOT NULL,
  id_Category integer NOT NULL,
  description character varying,
  creationDate timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  endDate timestamp with time zone NOT NULL,
  id_Priority integer NOT NULL,
  state boolean NOT NULL DEFAULT false,
  id_Task integer,
  CONSTRAINT subTask_pkey PRIMARY KEY (id_SubTask),
  CONSTRAINT subTask_id_Task_fkey FOREIGN KEY (id_Task) REFERENCES public.tasks(id),
  CONSTRAINT subTask_id_Category_fkey FOREIGN KEY (id_Category) REFERENCES public.categories(id),
  CONSTRAINT subTask_id_Priority_fkey FOREIGN KEY (id_Priority) REFERENCES public.priorities(id)
);
CREATE TABLE public.subjects (
  id integer NOT NULL DEFAULT nextval('subjects_id_seq'::regclass),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  grade numeric DEFAULT 0.00,
  progress integer DEFAULT 0,
  color character varying DEFAULT 'blue'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id integer NOT NULL DEFAULT nextval('tasks_id_seq'::regclass),
  title character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone NOT NULL,
  priority_id integer NOT NULL,
  category_id integer,
  completed boolean DEFAULT false,
  user_id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  subject_id integer,
  parent_task_id integer,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.priorities(id),
  CONSTRAINT tasks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT tasks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.userAchievements (
  achievementId character varying NOT NULL,
  unlockedAt timestamp with time zone,
  progress integer NOT NULL DEFAULT 0,
  isCompleted boolean NOT NULL DEFAULT false,
  id_User uuid NOT NULL,
  id integer NOT NULL DEFAULT nextval('"userAchievements_id_seq"'::regclass),
  CONSTRAINT userAchievements_pkey PRIMARY KEY (id),
  CONSTRAINT userAchievements_id_User_fkey FOREIGN KEY (id_User) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  carrer character varying,
  bio text,
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);