/**
 * Actualiza progreso de cursos (enrollment), materias (subjects) y estadísticas
 * para David — coherente con 2 semestres UPC de actividad.
 *
 * Run: node scripts/update-david-progress-stats.js
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DAVID_ID = "6438b565-5e1e-4267-9f5c-b418af15b25f";
const TODAY = new Date("2026-06-10T12:00:00-05:00");

const SUBJECT_COLORS = ["blue", "green", "purple", "orange", "red", "yellow"];

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function seededProgress(courseId, isPastSemester) {
  const seed = (courseId * 17 + 41) % 100;
  if (isPastSemester) return 88 + (seed % 13);
  return 58 + (seed % 28);
}

async function computeSubmissionPct(courseId, studentId) {
  const { data: assignments } = await sb
    .from("course_assignments")
    .select("id")
    .eq("course_id", courseId);
  const ids = assignments?.map((a) => a.id) ?? [];
  if (!ids.length) return 0;

  const { count } = await sb
    .from("assignment_submissions")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .in("assignment_id", ids);
  return Math.round(((count ?? 0) / ids.length) * 100);
}

async function computeAvgGrade(courseId, studentId) {
  const { data: assignments } = await sb
    .from("course_assignments")
    .select("id")
    .eq("course_id", courseId);
  const ids = assignments?.map((a) => a.id) ?? [];
  if (!ids.length) return 0;

  const { data: subs } = await sb
    .from("assignment_submissions")
    .select("grade")
    .eq("student_id", studentId)
    .in("assignment_id", ids)
    .eq("graded", true)
    .not("grade", "is", null);

  if (!subs?.length) return 0;
  const avg = subs.reduce((s, x) => s + Number(x.grade), 0) / subs.length;
  return +avg.toFixed(2);
}

function blendProgress(submissionPct, target, isPastSemester) {
  if (isPastSemester) {
    return Math.min(100, Math.max(submissionPct, target + rnd(-2, 3)));
  }
  const blended = Math.round(submissionPct * 0.45 + target * 0.55);
  return Math.min(88, Math.max(55, blended + rnd(-3, 4)));
}

async function ensureProgressColumn() {
  const { error } = await sb.from("course_enrollments").select("progress").limit(1);
  if (error?.message?.includes("progress")) {
    throw new Error(
      "Falta la columna course_enrollments.progress en Supabase. " +
        "Ejecuta en SQL Editor el archivo src/db/migrations/004_enrollment_progress.sql"
    );
  }
  if (error) throw error;
}

async function updateEnrollmentProgress(enrollmentId, progress) {
  const { error } = await sb
    .from("course_enrollments")
    .update({ progress })
    .eq("id", enrollmentId);
  if (error) throw new Error(`enrollment progress: ${error.message}`);
}

async function updateCourseEnrollments() {
  const { data: enrollments, error } = await sb
    .from("course_enrollments")
    .select("id, enrolled_at, course_id, courses(id, title)")
    .eq("student_id", DAVID_ID);
  if (error) throw error;

  const progressByCourse = [];

  for (const e of enrollments ?? []) {
    const course = e.courses;
    if (!course) continue;

    const isPast = new Date(e.enrolled_at) < new Date("2026-01-01");
    const submissionPct = await computeSubmissionPct(course.id, DAVID_ID);
    const target = seededProgress(course.id, isPast);
    const progress = blendProgress(submissionPct, target, isPast);

    await updateEnrollmentProgress(e.id, progress);

    progressByCourse.push({
      courseId: course.id,
      title: course.title,
      progress,
      grade: await computeAvgGrade(course.id, DAVID_ID),
      isPast,
    });
  }

  console.log(`  ✓ Progreso guardado en BD para ${progressByCourse.length} inscripciones`);
  return progressByCourse;
}

async function updateSubjects(progressByCourse) {
  await sb.from("subjects").delete().eq("user_id", DAVID_ID);

  if (!progressByCourse.length) {
    console.log("  ⚠ Sin cursos para crear materias");
    return;
  }

  const rows = progressByCourse.map((c, i) => ({
    user_id: DAVID_ID,
    name: c.title,
    grade: c.grade || (c.isPast ? rnd(32, 48) / 10 : rnd(34, 46) / 10),
    progress: c.progress,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    created_at: c.isPast ? "2025-09-01T00:00:00Z" : "2026-02-15T00:00:00Z",
    updated_at: TODAY.toISOString(),
  }));

  const { error } = await sb.from("subjects").insert(rows);
  if (error) throw new Error(`subjects: ${error.message}`);
  console.log(`  ✓ ${rows.length} materias con progreso y promedio`);
}

async function updateStatistics() {
  const { count: totalTasks } = await sb
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DAVID_ID);
  const { count: completedTasks } = await sb
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DAVID_ID)
    .eq("completed", true);

  const racha = rnd(12, 24);
  const bestStreak = racha + rnd(8, 20);
  const yesterday = new Date(TODAY);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: categories } = await sb
    .from("categories")
    .select("id")
    .eq("user_id", DAVID_ID)
    .limit(5);
  const favoriteCategory = categories?.length ? categories[rnd(0, categories.length - 1)].id : null;

  const payload = {
    id_User: DAVID_ID,
    racha,
    bestStreak,
    totalTasks: totalTasks ?? 0,
    completedTasks: completedTasks ?? 0,
    dailyGoal: 5,
    lastRachaDate: yesterday.toISOString(),
    startDate: new Date("2025-08-04T08:00:00-05:00").toISOString(),
    endDate: TODAY.toISOString(),
    favoriteCategory,
  };

  const { data: existing } = await sb
    .from("statistics")
    .select("id_Statistics")
    .eq("id_User", DAVID_ID)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("statistics").update(payload).eq("id_User", DAVID_ID);
    if (error) throw error;
  } else {
    const { error } = await sb.from("statistics").insert(payload);
    if (error) throw error;
  }

  console.log(`  ✓ Estadísticas: racha ${racha}d, mejor ${bestStreak}d, ${completedTasks}/${totalTasks} tareas`);
}

async function backfillWeeklyTaskActivity() {
  const { data: completed } = await sb
    .from("tasks")
    .select("id, updated_at")
    .eq("user_id", DAVID_ID)
    .eq("completed", true)
    .order("id");

  if (!completed?.length) return;

  const days = [6, 5, 4, 3, 2, 1, 0];
  let dayIdx = 0;

  for (const task of completed.slice(0, 18)) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - days[dayIdx % days.length]);
    d.setHours(rnd(9, 20), rnd(0, 59), 0, 0);

    await sb.from("tasks").update({ updated_at: d.toISOString() }).eq("id", task.id);
    dayIdx++;
  }

  console.log(`  ✓ Actividad semanal repartida en ${Math.min(18, completed.length)} tareas completadas`);
}

async function seedStudySessions() {
  await sb.from("study_sessions").delete().eq("user_id", DAVID_ID);

  const { data: subjects } = await sb.from("subjects").select("id, name").eq("user_id", DAVID_ID);
  if (!subjects?.length) return;

  const sessions = [];
  for (let week = 0; week < 36; week++) {
    const subject = subjects[rnd(0, subjects.length - 1)];
    const sessionDate = new Date("2025-08-10T00:00:00-05:00");
    sessionDate.setDate(sessionDate.getDate() + week * 7 + rnd(0, 4));

    if (sessionDate > TODAY) break;

    sessions.push({
      user_id: DAVID_ID,
      subject_id: subject.id,
      duration_minutes: rnd(45, 150),
      session_date: sessionDate.toISOString(),
      notes: `Sesión de estudio — ${subject.name}`,
    });
  }

  if (sessions.length) {
    const { error } = await sb.from("study_sessions").insert(sessions);
    if (error && !error.message.includes("study_sessions")) throw error;
    else if (!error) console.log(`  ✓ ${sessions.length} sesiones de estudio históricas`);
  }
}

export async function updateDavidProgressAndStats() {
  console.log("\n📊  Actualizando progreso y estadísticas de David...\n");

  await ensureProgressColumn();
  const progressByCourse = await updateCourseEnrollments();
  await updateSubjects(progressByCourse);
  await updateStatistics();
  await backfillWeeklyTaskActivity();
  await seedStudySessions();

  console.log("\n✅  Progreso y estadísticas actualizados");
  return progressByCourse;
}

const isMain = process.argv[1]?.endsWith("update-david-progress-stats.js");
if (isMain) {
  updateDavidProgressAndStats().catch((e) => {
    console.error("💥", e.message);
    process.exit(1);
  });
}
