/**
 * Reset + seed: David Santiago Barcelo Teran (davidbarcelo0411@gmail.com)
 *
 * Simula 1 año académico en la UPC (Universidad Popular del Cesar):
 *   - 2025-II (ago–dic 2025, completado)
 *   - 2026-I (feb–jun 2026, semestre actual)
 *
 * Fase 1: Limpia datos personales de David (sin borrar cursos compartidos).
 * Fase 2: Crea cursos, inscripciones, entregas, grupos, tareas, notas y eventos.
 *
 * Run: node scripts/reset-and-seed-david-year.js
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { updateDavidProgressAndStats } from "./update-david-progress-stats.js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DAVID_ID = "6438b565-5e1e-4267-9f5c-b418af15b25f";
const TODAY = new Date("2026-06-10T12:00:00-05:00");

const UPC_INSTITUTION = {
  name: "Universidad Popular del Cesar",
  slug: "unicesar",
  domain: "unicesar.edu.co",
  city: "Valledupar",
  country: "Colombia",
  address: "Calle 16 #13-15, Valledupar",
  phone: "+57 605 574 7624",
  email: "info.mock@unicesar.edu.co",
  website: "https://unicesar.edu.co",
};

const PERIODS = [
  { name: "2025-II", start: "2025-08-04", end: "2025-12-12", is_active: false },
  { name: "2026-I", start: "2026-02-03", end: "2026-06-20", is_active: true },
];

const COURSES_2025_II = [
  { title: "Programación Orientada a Objetos", description: "Clases, herencia, polimorfismo y patrones básicos con Java." },
  { title: "Estructuras de Datos", description: "Listas, pilas, colas, árboles y grafos. Análisis de complejidad." },
  { title: "Cálculo Integral", description: "Integrales definidas e indefinidas, técnicas de integración y aplicaciones." },
  { title: "Bases de Datos I", description: "Modelo relacional, SQL, normalización y diseño de esquemas." },
  { title: "Comunicación Oral", description: "Técnicas de exposición académica y presentaciones profesionales." },
];

const COURSES_2026_I = [
  { title: "Fundamentos de Programación", description: "Introducción a la programación estructurada con Python." },
  { title: "Cálculo Diferencial", description: "Límites, derivadas y aplicaciones para ingeniería." },
  { title: "Física Mecánica", description: "Cinemática, dinámica, trabajo, energía y movimiento oscilatorio." },
  { title: "Matemáticas Discretas", description: "Lógica, conjuntos, combinatoria, grafos y demostraciones." },
  { title: "Introducción a la Computación", description: "Arquitectura, sistemas operativos, redes y fundamentos de hardware." },
];

const ASSIGNMENT_TEMPLATES_PAST = [
  { title: "Quiz 1", description: "Evaluación corta de conceptos fundamentales.", date: null, graded: true },
  { title: "Taller 1", description: "Taller práctico de ejercicios aplicados.", date: null, graded: true },
  { title: "Primer Parcial", description: "Evaluación escrita del primer corte.", date: null, graded: true },
  { title: "Taller 2", description: "Taller de refuerzo del segundo corte.", date: null, graded: true },
  { title: "Segundo Parcial", description: "Evaluación escrita del segundo corte.", date: null, graded: true },
  { title: "Proyecto Final", description: "Proyecto integrador del semestre.", date: null, graded: true },
];

const ASSIGNMENT_DATES_2025_II = [
  "2025-09-18", "2025-10-02", "2025-10-16", "2025-11-06", "2025-11-20", "2025-12-05",
];

const ASSIGNMENT_DATES_2026_I_PAST = [
  "2026-02-20", "2026-03-06", "2026-03-20", "2026-04-10", "2026-05-08",
];

const ASSIGNMENT_DATES_2026_I_FUTURE = [
  { title: "Segundo Parcial", date: "2026-06-12", graded: false },
  { title: "Proyecto Final", date: "2026-06-18", graded: false },
];

const DAVID_GRADES_2025_II = {
  "Programación Orientada a Objetos": { "Quiz 1": 4.2, "Taller 1": 4.5, "Primer Parcial": 4.0, "Taller 2": 4.3, "Segundo Parcial": 3.9, "Proyecto Final": 4.6 },
  "Estructuras de Datos": { "Quiz 1": 3.8, "Taller 1": 4.0, "Primer Parcial": 3.5, "Taller 2": 3.7, "Segundo Parcial": 3.6, "Proyecto Final": 4.1 },
  "Cálculo Integral": { "Quiz 1": 3.2, "Taller 1": 3.5, "Primer Parcial": 3.0, "Taller 2": 3.4, "Segundo Parcial": 3.3, "Proyecto Final": 3.8 },
  "Bases de Datos I": { "Quiz 1": 4.5, "Taller 1": 4.7, "Primer Parcial": 4.3, "Taller 2": 4.6, "Segundo Parcial": 4.4, "Proyecto Final": 4.8 },
  "Comunicación Oral": { "Quiz 1": 4.0, "Taller 1": 4.2, "Primer Parcial": 4.1, "Taller 2": 4.0, "Segundo Parcial": 4.3, "Proyecto Final": 4.5 },
};

const DAVID_GRADES_2026_I = {
  "Fundamentos de Programación": { "Quiz 1": 4.8, "Taller 1": 5.0, "Primer Parcial": 4.5, "Taller 2": 4.7, "Segundo Parcial": null, "Proyecto Final": null },
  "Cálculo Diferencial": { "Quiz 1": 3.8, "Taller 1": 4.0, "Primer Parcial": 3.6, "Taller 2": 3.9, "Segundo Parcial": null, "Proyecto Final": null },
  "Física Mecánica": { "Quiz 1": 3.5, "Taller 1": 3.8, "Primer Parcial": 3.4, "Taller 2": 3.7, "Segundo Parcial": null, "Proyecto Final": null },
  "Matemáticas Discretas": { "Quiz 1": 4.0, "Taller 1": 4.2, "Primer Parcial": 3.9, "Taller 2": 4.1, "Segundo Parcial": null, "Proyecto Final": null },
  "Introducción a la Computación": { "Quiz 1": 4.6, "Taller 1": 4.8, "Primer Parcial": 4.5, "Taller 2": 4.7, "Segundo Parcial": null, "Proyecto Final": null },
};

const GROUP_DEFS = [
  { courseTitle: "Programación Orientada a Objetos", name: "Equipo POO - Proyecto Biblioteca", description: "Desarrollo del sistema de biblioteca en Java.", members: 2 },
  { courseTitle: "Estructuras de Datos", name: "Grupo Estructuras - Taller AVL", description: "Implementación de árbol AVL y análisis de complejidad.", members: 2 },
  { courseTitle: "Fundamentos de Programación", name: "Grupo Proyecto Final - Python", description: "Aplicación de gestión académica con Python.", members: 3 },
  { courseTitle: "Física Mecánica", name: "Laboratorio Física - Grupo 3", description: "Informes de laboratorio y experimentos de mecánica.", members: 2 },
  { courseTitle: "Introducción a la Computación", name: "Equipo Hackathon UPC 2026", description: "Participación en hackathon de la facultad de Sistemas.", members: 3 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const insert = async (table, rows, opts = {}) => {
  const payload = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await sb.from(table).insert(payload, opts).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};

const del = async (table, filter) => {
  let q = sb.from(table).delete();
  for (const [col, val] of Object.entries(filter)) q = q.eq(col, val);
  const { error } = await q;
  if (error) throw new Error(`delete ${table}: ${error.message}`);
};

const delIn = async (table, col, values) => {
  if (!values?.length) return;
  const { error } = await sb.from(table).delete().in(col, values);
  if (error) throw new Error(`delete ${table} in: ${error.message}`);
};

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function absDate(dateStr, time = "09:00") {
  return new Date(`${dateStr}T${time}:00-05:00`).toISOString();
}

function feedbackFor(grade) {
  if (grade >= 4.5) return "Excelente trabajo. Dominio completo de los temas evaluados.";
  if (grade >= 4.0) return "Muy buen desempeño. Comprensión sólida con pequeños detalles por refinar.";
  if (grade >= 3.5) return "Buen trabajo. Algunos conceptos requieren mayor profundización.";
  return "Aprobado. Necesitas reforzar los fundamentos antes del siguiente parcial.";
}

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

// ── Phase A: Cleanup ─────────────────────────────────────────────────────────

async function cleanupDavidData() {
  console.log("🧹  Limpiando datos de David...\n");

  await del("assignment_submissions", { student_id: DAVID_ID });
  console.log("  ✓ assignment_submissions");

  await del("course_group_members", { student_id: DAVID_ID });
  console.log("  ✓ course_group_members (David)");

  const { data: davidGroups } = await sb.from("course_groups").select("id").eq("created_by", DAVID_ID);
  const groupIds = (davidGroups ?? []).map((g) => g.id);
  if (groupIds.length) {
    await delIn("course_group_members", "group_id", groupIds);
    await delIn("course_groups", "id", groupIds);
    console.log(`  ✓ course_groups creados por David (${groupIds.length})`);
  }

  await del("course_enrollments", { student_id: DAVID_ID });
  console.log("  ✓ course_enrollments");

  const { data: davidTasks } = await sb.from("tasks").select("id").eq("user_id", DAVID_ID);
  const taskIds = (davidTasks ?? []).map((t) => t.id);
  if (taskIds.length) {
    await delIn("subTask", "id_Task", taskIds);
    console.log(`  ✓ subTask (${taskIds.length} tasks)`);
  }

  await del("tasks", { user_id: DAVID_ID });
  await del("events", { user_id: DAVID_ID });
  await del("notes", { user_id: DAVID_ID });
  await del("subjects", { user_id: DAVID_ID });
  await del("study_sessions", { user_id: DAVID_ID });
  console.log("  ✓ tasks, events, notes, subjects, study_sessions\n");
}

// ── Phase B: Institution & periods ───────────────────────────────────────────

async function resolveUpc() {
  let { data: inst } = await sb.from("institutions").select("id").eq("slug", UPC_INSTITUTION.slug).maybeSingle();

  if (!inst) {
    const [created] = await insert("institutions", UPC_INSTITUTION);
    inst = created;
    console.log(`✓ Institución UPC creada (${inst.id})`);
  } else {
    console.log(`↩ Institución UPC existente (${inst.id})`);
  }

  const { error } = await sb.from("users").update({ institution_id: inst.id }).eq("id", DAVID_ID);
  if (error) throw error;
  console.log("✓ David vinculado a UPC");

  const periodIds = {};
  for (const p of PERIODS) {
    const { data: existing } = await sb
      .from("academic_periods")
      .select("id")
      .eq("institution_id", inst.id)
      .eq("name", p.name)
      .maybeSingle();

    if (existing) {
      periodIds[p.name] = existing.id;
      console.log(`↩ Periodo ${p.name} ya existe`);
    } else {
      const [created] = await insert("academic_periods", {
        institution_id: inst.id,
        name: p.name,
        start_date: p.start,
        end_date: p.end,
        is_active: p.is_active,
      });
      periodIds[p.name] = created.id;
      console.log(`✓ Periodo ${p.name} creado`);
    }
  }

  return { upcId: inst.id, periodIds };
}

async function getOrCreateScale(upcId) {
  const { data: existing } = await sb.from("grading_scales").select("id").eq("institution_id", upcId).maybeSingle();
  if (existing) return existing.id;

  const [s] = await insert("grading_scales", {
    institution_id: upcId,
    name: "Escala 0-5 UPC",
    min_score: 0,
    max_score: 5,
    is_default: true,
  });
  return s.id;
}

async function getTeachers(upcId) {
  const { data, error } = await sb
    .from("users")
    .select("id, name")
    .eq("institution_id", upcId)
    .eq("role", "teacher")
    .limit(10);
  if (error) throw error;
  if (!data?.length) console.warn("⚠ No hay profesores UPC mock; los cursos usarán el primer teacher disponible.");
  return data ?? [];
}

async function getStudents(upcId) {
  const { data } = await sb
    .from("users")
    .select("id, name, email")
    .eq("institution_id", upcId)
    .eq("role", "student")
    .neq("id", DAVID_ID)
    .limit(80);
  return data ?? [];
}

// ── Courses, assignments, submissions ──────────────────────────────────────────

async function createCourse(def, teacher, upcId, periodId, scaleId) {
  const [c] = await insert("courses", {
    title: def.title,
    description: def.description,
    teacher_id: teacher.id,
    institution_id: upcId,
    invite_code: randomCode(),
    period_id: periodId,
    grading_scale_id: scaleId,
  });
  return c;
}

async function enrollDavid(courseId, enrolledAt) {
  await insert("course_enrollments", {
    course_id: courseId,
    student_id: DAVID_ID,
    enrolled_at: enrolledAt,
  });
}

async function enrollStudents(courseId, studentIds, enrolledAt) {
  if (!studentIds.length) return;
  const rows = studentIds.map((id) => ({
    course_id: courseId,
    student_id: id,
    enrolled_at: enrolledAt,
  }));
  const { error } = await sb.from("course_enrollments").insert(rows);
  if (error && !error.message.includes("duplicate")) throw new Error(`enrollment: ${error.message}`);
}

async function createAssignmentsForCourse(course, dates, { includeFuture = false, pastOnly = false } = {}) {
  const assignments = [];
  const templates = pastOnly
    ? ASSIGNMENT_TEMPLATES_PAST.slice(0, 4)
    : [...ASSIGNMENT_TEMPLATES_PAST];

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    const dueDate = dates[i] ?? dates[dates.length - 1];
    const [a] = await insert("course_assignments", {
      course_id: course.id,
      title: tmpl.title,
      description: tmpl.description,
      due_date: absDate(dueDate, "23:59"),
      is_group_assignment: tmpl.title === "Proyecto Final",
    });
    assignments.push({ ...a, dueDate, graded: true });
  }

  if (includeFuture) {
    for (const fut of ASSIGNMENT_DATES_2026_I_FUTURE) {
      const [a] = await insert("course_assignments", {
        course_id: course.id,
        title: fut.title,
        description: `Evaluación del corte final — ${course.title}.`,
        due_date: absDate(fut.date, "23:59"),
        is_group_assignment: fut.title === "Proyecto Final",
      });
      assignments.push({ ...a, dueDate: fut.date, graded: false });
    }
  }

  return assignments;
}

async function createSubmissions(courseTitle, assignments, gradesMap, semesterComplete) {
  const courseGrades = gradesMap[courseTitle] ?? {};
  for (const a of assignments) {
    const grade = courseGrades[a.title];
    const isPast = new Date(a.due_date) < TODAY;
    if (!isPast && !semesterComplete) continue;
    if (grade == null && !semesterComplete) continue;

    const submittedAt = new Date(a.due_date);
    submittedAt.setDate(submittedAt.getDate() - 1);

    await insert("assignment_submissions", {
      assignment_id: a.id,
      student_id: DAVID_ID,
      submitted_at: submittedAt.toISOString(),
      graded: grade != null,
      grade: grade ?? null,
      feedback: grade != null ? feedbackFor(grade) : null,
      file_url: null,
    });
  }
}

async function seedCourses(upcId, periodIds, scaleId, teachers, students) {
  const courseMap = {};
  const allCourseData = [];

  console.log("\n📚  Creando cursos 2025-II...");
  for (let i = 0; i < COURSES_2025_II.length; i++) {
    const def = COURSES_2025_II[i];
    const teacher = teachers[i % teachers.length] ?? teachers[0];
    if (!teacher) throw new Error("No hay profesores UPC para asignar cursos.");
    const course = await createCourse(def, teacher, upcId, periodIds["2025-II"], scaleId);
    courseMap[def.title] = course;
    await enrollDavid(course.id, absDate("2025-08-04", "08:00"));
    const assignments = await createAssignmentsForCourse(course, ASSIGNMENT_DATES_2025_II, false);
    await createSubmissions(def.title, assignments, DAVID_GRADES_2025_II, true);
    allCourseData.push({ course, assignments, def });
    console.log(`  ✓ ${def.title}`);
  }

  console.log("\n📚  Creando cursos 2026-I...");
  for (let i = 0; i < COURSES_2026_I.length; i++) {
    const def = COURSES_2026_I[i];
    const teacher = teachers[(i + 2) % teachers.length] ?? teachers[0];
    const course = await createCourse(def, teacher, upcId, periodIds["2026-I"], scaleId);
    courseMap[def.title] = course;
    await enrollDavid(course.id, absDate("2026-02-03", "08:00"));
    const assignments = await createAssignmentsForCourse(course, ASSIGNMENT_DATES_2026_I_PAST, {
      includeFuture: true,
      pastOnly: true,
    });
    await createSubmissions(def.title, assignments, DAVID_GRADES_2026_I, false);
    allCourseData.push({ course, assignments, def });
    console.log(`  ✓ ${def.title}`);
  }

  return { courseMap, allCourseData, students };
}

// ── Groups ───────────────────────────────────────────────────────────────────

async function seedGroups(courseMap, students) {
  console.log("\n👥  Creando grupos...");
  let created = 0;

  for (const g of GROUP_DEFS) {
    const course = courseMap[g.courseTitle];
    if (!course) {
      console.warn(`  ⚠ Curso no encontrado: ${g.courseTitle}`);
      continue;
    }

    const mates = pickRandom(students, g.members);
    await enrollStudents(
      course.id,
      mates.map((s) => s.id),
      course.title.includes("2025") ? absDate("2025-08-10") : absDate("2026-02-10")
    );

    const [group] = await insert("course_groups", {
      course_id: course.id,
      name: g.name,
      description: g.description,
      created_by: DAVID_ID,
    });

    await insert("course_group_members", { group_id: group.id, student_id: DAVID_ID });
    for (const mate of mates) {
      await insert("course_group_members", { group_id: group.id, student_id: mate.id });
    }

    console.log(`  ✓ ${g.name} (${mates.length + 1} miembros)`);
    created++;
  }

  return created;
}

// ── Personal data ────────────────────────────────────────────────────────────

async function createTasks() {
  const tasks = [
    // 2025-II — completadas
    { title: "Entregar proyecto POO - Biblioteca", description: "Sistema de préstamos en Java con SQLite.", due: "2025-12-04", priority_id: 3, completed: true },
    { title: "Implementar árbol AVL", description: "Taller de Estructuras de Datos con rotaciones.", due: "2025-11-18", priority_id: 3, completed: true },
    { title: "Estudiar integrales por partes", description: "Repaso para segundo parcial de Cálculo Integral.", due: "2025-11-15", priority_id: 2, completed: true },
    { title: "Normalizar base de datos del proyecto", description: "Tercera forma normal para Bases de Datos I.", due: "2025-11-28", priority_id: 2, completed: true },
    { title: "Practicar exposición oral", description: "Ensayo de presentación de Comunicación Oral.", due: "2025-12-08", priority_id: 1, completed: true },
    { title: "Repasar consultas SQL JOIN", description: "INNER, LEFT y subconsultas para el parcial.", due: "2025-10-12", priority_id: 2, completed: true },
    { title: "Leer capítulo herencia en Java", description: "Material del curso POO semana 6.", due: "2025-09-25", priority_id: 1, completed: true },
    { title: "Resolver ejercicios de grafos", description: "BFS y DFS para Estructuras de Datos.", due: "2025-11-02", priority_id: 2, completed: true },
    { title: "Preparar informe de laboratorio", description: "Cálculo Integral — áreas bajo la curva.", due: "2025-10-28", priority_id: 2, completed: true },
    { title: "Inscribir materias 2026-I", description: "Preinscripción en portal UPC.", due: "2025-12-15", priority_id: 3, completed: true },
    // Transición dic 2025 – ene 2026
    { title: "Descargar horario 2026-I", description: "Confirmar cruce de Fundamentos y Cálculo.", due: "2026-01-20", priority_id: 2, completed: true },
    { title: "Comprar materiales de Física", description: "Cuaderno de laboratorio y calculadora.", due: "2026-01-28", priority_id: 1, completed: true },
    // 2026-I — completadas
    { title: "Hacer ejercicios de derivadas", description: "Sección 3.2 del libro de Cálculo.", due: "2026-03-15", priority_id: 2, completed: true },
    { title: "Ver clase grabada de recursión", description: "Fundamentos de Programación — semana 5.", due: "2026-03-22", priority_id: 1, completed: true },
    { title: "Entregar taller de grafos discretos", description: "Matemáticas Discretas — caminos eulerianos.", due: "2026-04-05", priority_id: 2, completed: true },
    { title: "Informe laboratorio movimiento parabólico", description: "Física Mecánica — práctica 3.", due: "2026-04-18", priority_id: 2, completed: true },
    { title: "Repasar arquitectura von Neumann", description: "Introducción a la Computación.", due: "2026-03-10", priority_id: 1, completed: true },
    { title: "Formar grupo proyecto Python", description: "Coordinar con compañeros del curso.", due: "2026-02-20", priority_id: 2, completed: true },
    { title: "Resolver ejercicios de lógica proposicional", description: "Matemáticas Discretas — tablas de verdad.", due: "2026-02-25", priority_id: 2, completed: true },
    { title: "Practicar presentación hackathon", description: "Pitch de 3 minutos para el equipo.", due: "2026-05-20", priority_id: 2, completed: true },
    // 2026-I — pendientes (finales de semestre)
    { title: "Estudiar para Segundo Parcial de Cálculo", description: "Optimización, regla de la cadena y TVM.", due: "2026-06-11", priority_id: 3, completed: false },
    { title: "Repasar Leyes de Newton", description: "Énfasis en segunda ley y fricción.", due: "2026-06-09", priority_id: 3, completed: false },
    { title: "Hacer Taller 3 de Programación", description: "POO en Python — clases y herencia.", due: "2026-06-08", priority_id: 3, completed: false },
    { title: "Preparar slides Proyecto Final Computación", description: "Mínimo 12 diapositivas con demo.", due: "2026-06-16", priority_id: 3, completed: false },
    { title: "Repasar combinatoria para parcial", description: "Permutaciones, combinaciones y principio de inclusión-exclusión.", due: "2026-06-10", priority_id: 2, completed: false },
    { title: "Entregar informe laboratorio Física", description: "Movimiento circular uniforme.", due: "2026-06-12", priority_id: 3, completed: false },
    { title: "Revisar retroalimentación Primer Parcial Cálculo", description: "Errores en límites y continuidad.", due: "2026-06-07", priority_id: 2, completed: false },
    { title: "Coordinar ensayo grupal proyecto Python", description: "Reunión con el Grupo Proyecto Final.", due: "2026-06-13", priority_id: 2, completed: false },
    { title: "Preinscripción semestre 2026-II", description: "Revisar créditos y prerrequisitos en portal UPC.", due: "2026-06-25", priority_id: 1, completed: false },
    { title: "Actualizar hoja de vida para prácticas", description: "Feria de empleo UPC julio 2026.", due: "2026-06-30", priority_id: 1, completed: false },
    { title: "Repasar sistemas operativos — planificación", description: "FCFS, SJF y Round Robin para parcial.", due: "2026-06-11", priority_id: 2, completed: false },
    { title: "Completar ejercicios de integrales", description: "Repaso cruzado con Cálculo Diferencial.", due: "2026-06-14", priority_id: 1, completed: false },
    { title: "Enviar código proyecto hackathon", description: "Repositorio GitHub y README.", due: "2026-06-17", priority_id: 2, completed: false },
    { title: "Asistir tutoría monitor de Cálculo", description: "Sesión de preguntas antes del parcial.", due: "2026-06-09", priority_id: 2, completed: false },
    { title: "Organizar apuntes del semestre", description: "Archivar notas 2026-I en carpetas por materia.", due: "2026-06-20", priority_id: 1, completed: false },
    { title: "Practicar demostraciones por inducción", description: "Matemáticas Discretas — ejercicios tipo parcial.", due: "2026-06-10", priority_id: 3, completed: false },
    { title: "Backup de proyectos en la nube", description: "Google Drive + USB antes de entregas finales.", due: "2026-06-15", priority_id: 1, completed: false },
    { title: "Confirmar horario de exámenes finales", description: "Revisar publicación en campus virtual UPC.", due: "2026-06-08", priority_id: 2, completed: true },
    { title: "Devolver libro de biblioteca UPC", description: "Cálculo Diferencial — vence esta semana.", due: "2026-06-11", priority_id: 1, completed: false },
    { title: "Solicitar certificado de notas 2025-II", description: "Trámite en registro académico.", due: "2026-02-05", priority_id: 1, completed: true },
  ];

  const rows = tasks.map((t) => {
    const due = new Date(`${t.due}T17:00:00-05:00`);
    const created = new Date(due);
    created.setDate(created.getDate() - Math.floor(Math.random() * 14 + 3));
    return {
      title: t.title,
      description: t.description,
      due_date: due.toISOString(),
      priority_id: t.priority_id,
      completed: t.completed,
      user_id: DAVID_ID,
      created_at: created.toISOString(),
    };
  });

  await insert("tasks", rows);
  console.log(`✓ ${rows.length} tareas creadas`);
  return rows.length;
}

async function createEvents() {
  const events = [
    // 2025-II
    { title: "Inicio semestre 2025-II UPC", type: "Clase", start: "2025-08-04T07:00:00-05:00", description: "Primer día de clases segundo semestre 2025." },
    { title: "Clase POO — Herencia", type: "Clase", start: "2025-09-10T08:00:00-05:00", description: "Edificio de Sistemas, salón 102." },
    { title: "Quiz 1 — Estructuras de Datos", type: "Examen", start: "2025-09-18T10:00:00-05:00", description: "Evaluación en laboratorio." },
    { title: "Primer Parcial — Bases de Datos I", type: "Examen", start: "2025-10-16T14:00:00-05:00", description: "Modelo ER y SQL básico." },
    { title: "Entrega Taller AVL", type: "Entrega", start: "2025-11-18T23:59:00-05:00", description: "Subir al campus virtual UPC." },
    { title: "Segundo Parcial — Cálculo Integral", type: "Examen", start: "2025-11-20T08:00:00-05:00", description: "Salón 201, bloque de Matemáticas." },
    { title: "Exposición Comunicación Oral", type: "Entrega", start: "2025-12-08T10:00:00-05:00", description: "Presentación de 8 minutos." },
    { title: "Entrega Proyecto POO", type: "Entrega", start: "2025-12-05T23:59:00-05:00", description: "Sistema biblioteca Java + informe." },
    { title: "Reunión equipo POO", type: "Reunión", start: "2025-11-25T16:00:00-05:00", description: "Biblioteca UPC — revisión de código." },
    { title: "Cierre semestre 2025-II", type: "Clase", start: "2025-12-12T12:00:00-05:00", description: "Último día de clases." },
    // Transición
    { title: "Matrícula ordinaria 2026-I", type: "Reunión", start: "2026-01-25T09:00:00-05:00", description: "Ventanilla de registro académico UPC." },
    // 2026-I — pasados
    { title: "Inicio semestre 2026-I UPC", type: "Clase", start: "2026-02-03T07:00:00-05:00", description: "Bienvenida facultad de Ingeniería de Sistemas." },
    { title: "Clase Fundamentos — Recursión", type: "Clase", start: "2026-03-10T10:00:00-05:00", description: "Laboratorio de cómputo 1." },
    { title: "Primer Parcial — Fundamentos de Programación", type: "Examen", start: "2026-03-20T08:00:00-05:00", description: "Resultado: 4.5/5.0" },
    { title: "Primer Parcial — Cálculo Diferencial", type: "Examen", start: "2026-03-22T08:00:00-05:00", description: "Resultado: 3.6/5.0" },
    { title: "Laboratorio Física — Parabólico", type: "Clase", start: "2026-04-15T14:00:00-05:00", description: "Edificio de Ciencias Básicas." },
    { title: "Entrega Taller Grafos", type: "Entrega", start: "2026-04-05T23:59:00-05:00", description: "Matemáticas Discretas." },
    { title: "Hackathon UPC 2026", type: "Reunión", start: "2026-05-22T08:00:00-05:00", description: "Facultad de Sistemas — 24 horas." },
    { title: "Tutoría Matemáticas Discretas", type: "Reunión", start: "2026-04-28T16:00:00-05:00", description: "Monitoría semana 12." },
    { title: "Clase Intro. Computación — SO", type: "Clase", start: "2026-05-05T09:00:00-05:00", description: "Planificación de procesos." },
    { title: "Quiz Sorpresa — Física", type: "Examen", start: "2026-04-20T11:00:00-05:00", description: "Leyes de Newton en clase." },
    // 2026-I — próximos (finales)
    { title: "Segundo Parcial — Cálculo Diferencial", type: "Examen", start: "2026-06-12T08:00:00-05:00", description: "Salón 105. Sin calculadora." },
    { title: "Segundo Parcial — Fundamentos de Programación", type: "Examen", start: "2026-06-13T10:00:00-05:00", description: "Laboratorio Ábaco. Traer portátil." },
    { title: "Segundo Parcial — Física Mecánica", type: "Examen", start: "2026-06-14T08:00:00-05:00", description: "Salón 302 Ciencias Básicas." },
    { title: "Segundo Parcial — Matemáticas Discretas", type: "Examen", start: "2026-06-15T14:00:00-05:00", description: "Combinatoria y grafos." },
    { title: "Segundo Parcial — Intro. a la Computación", type: "Examen", start: "2026-06-16T08:00:00-05:00", description: "Arquitectura y sistemas operativos." },
    { title: "Entrega Proyecto Final — Python", type: "Entrega", start: "2026-06-17T23:59:00-05:00", description: "Campus virtual + demo presencial." },
    { title: "Entrega Proyecto Final — Computación", type: "Entrega", start: "2026-06-18T10:00:00-05:00", description: "Presentación oral 10 min por grupo." },
    { title: "Entrega Informe Laboratorio Física", type: "Entrega", start: "2026-06-12T17:00:00-05:00", description: "Movimiento circular uniforme." },
    { title: "Sesión estudio grupal — Cálculo", type: "Reunión", start: "2026-06-09T18:00:00-05:00", description: "Biblioteca UPC sala 3." },
    { title: "Reunión proyecto hackathon", type: "Reunión", start: "2026-06-11T15:00:00-05:00", description: "Ensayo final de presentación." },
    { title: "Semana de evaluación final UPC", type: "Clase", start: "2026-06-19T07:00:00-05:00", description: "Semana de cierre 2026-I." },
    { title: "Feria prácticas profesionales UPC", type: "Reunión", start: "2026-07-08T09:00:00-05:00", description: "Edificio administrativo. Traer HV." },
    { title: "Clase Cálculo — Repaso final", type: "Clase", start: "2026-06-10T10:00:00-05:00", description: "Sesión de preguntas con el profesor." },
    { title: "Entrega Taller 3 Programación", type: "Entrega", start: "2026-06-08T23:59:00-05:00", description: "POO en Python." },
    { title: "Inducción club robótica UPC", type: "Reunión", start: "2026-02-15T16:00:00-05:00", description: "Plaza central del campus." },
    { title: "Primer Parcial — Intro. Computación", type: "Examen", start: "2026-03-24T08:00:00-05:00", description: "Resultado: 4.5/5.0" },
    { title: "Primer Parcial — Matemáticas Discretas", type: "Examen", start: "2026-03-26T14:00:00-05:00", description: "Resultado: 3.9/5.0" },
    { title: "Primer Parcial — Física Mecánica", type: "Examen", start: "2026-03-28T08:00:00-05:00", description: "Resultado: 3.4/5.0" },
    { title: "Reunión Grupo AVL", type: "Reunión", start: "2025-11-10T17:00:00-05:00", description: "División de tareas del taller." },
    { title: "Clase Bases de Datos — Normalización", type: "Clase", start: "2025-10-22T09:00:00-05:00", description: "Tercera forma normal." },
    { title: "Entrega informe Cálculo Integral", type: "Entrega", start: "2025-10-28T23:59:00-05:00", description: "Aplicaciones de integrales." },
    { title: "Examen diagnóstico Programación", type: "Examen", start: "2026-02-12T10:00:00-05:00", description: "Evaluación inicial del semestre." },
    { title: "Taller de escritura académica UPC", type: "Clase", start: "2025-11-05T14:00:00-05:00", description: "Comunicación Oral — citación APA." },
    { title: "Monitoría Cálculo Diferencial", type: "Reunión", start: "2026-06-08T16:00:00-05:00", description: "Oficina 108 bloque Matemáticas." },
    { title: "Cierre semestre 2026-I", type: "Clase", start: "2026-06-20T12:00:00-05:00", description: "Último día de clases del año académico." },
  ];

  const rows = events.map((e) => {
    const start = new Date(e.start);
    return {
      title: e.title,
      description: e.description,
      start_date: start.toISOString(),
      end_date: start.toISOString(),
      type: e.type,
      user_id: DAVID_ID,
      notify: true,
      is_past: start < TODAY,
      created_at: new Date(start.getTime() - 7 * 86400000).toISOString(),
    };
  });

  await insert("events", rows);
  console.log(`✓ ${rows.length} eventos creados`);
  return rows.length;
}

async function createNotes() {
  const notes = [
    {
      title: "POO — Herencia y polimorfismo",
      subject: "Programación Orientada a Objetos",
      is_pinned: false,
      content: "# Herencia en Java\n\nclass Estudiante extends Persona {\n  void estudiar() { ... }\n}\n\n## Polimorfismo\nPersona p = new Estudiante();\np.saludar(); // enlace dinámico",
    },
    {
      title: "Árboles AVL — Rotaciones",
      subject: "Estructuras de Datos",
      is_pinned: false,
      content: "# AVL\n\nBalance factor = altura(izq) - altura(der)\n|BF| <= 1\n\n## Rotaciones\n- LL, RR: simples\n- LR, RL: dobles",
    },
    {
      title: "Integrales — Técnicas básicas",
      subject: "Cálculo Integral",
      is_pinned: false,
      content: "# Integración\n\n∫ xⁿ dx = xⁿ⁺¹/(n+1) + C\n\n## Por partes\n∫ u dv = uv - ∫ v du\n\n## Sustitución\nu = g(x), du = g'(x) dx",
    },
    {
      title: "SQL — JOINs y normalización",
      subject: "Bases de Datos I",
      is_pinned: false,
      content: "# SQL\n\nSELECT * FROM A INNER JOIN B ON A.id = B.a_id;\n\n## Formas normales\n1NF: atomicidad\n2NF: sin dependencias parciales\n3NF: sin dependencias transitivas",
    },
    {
      title: "Tips exposición oral",
      subject: "Comunicación Oral",
      is_pinned: false,
      content: "# Presentación efectiva\n\n1. Gancho inicial (30 seg)\n2. Estructura: problema → solución → cierre\n3. Contacto visual\n4. Respirar antes de responder preguntas",
    },
    {
      title: "Python — Estructuras de datos",
      subject: "Fundamentos de Programación",
      is_pinned: true,
      content: "# Python\n\nlistas = []\ndicts = {}\n\n## List comprehension\n[x**2 for x in range(10)]\n\n## Recursión\ndef fact(n): return 1 if n<=1 else n*fact(n-1)",
    },
    {
      title: "Derivadas — Reglas esenciales",
      subject: "Cálculo Diferencial",
      is_pinned: true,
      content: "# Derivadas\n\nd/dx [xⁿ] = n·xⁿ⁻¹\nd/dx [f·g] = f'g + fg'\nRegla cadena: (f∘g)' = f'(g)·g'",
    },
    {
      title: "Leyes de Newton",
      subject: "Física Mecánica",
      is_pinned: true,
      content: "# Newton\n\n1. Inercia\n2. F = ma\n3. Acción-reacción\n\n## Cinemática\nv = v₀ + at\nx = x₀ + v₀t + ½at²",
    },
    {
      title: "Lógica y combinatoria",
      subject: "Matemáticas Discretas",
      is_pinned: true,
      content: "# Discretas\n\n## Combinaciones\nC(n,k) = n! / (k!(n-k)!)\n\n## Inducción\n1. Base\n2. Hipótesis\n3. Paso inductivo",
    },
    {
      title: "Arquitectura de computadores",
      subject: "Introducción a la Computación",
      is_pinned: false,
      content: "# Arquitectura\n\nCPU = ALU + CU + Registros\nCiclo: Fetch → Decode → Execute → Write-back\n\n## SO\nFCFS, SJF, Round Robin",
    },
    {
      title: "Cheat sheet Segundo Parcial Cálculo",
      subject: "Cálculo Diferencial",
      is_pinned: true,
      content: "# Parcial 2\n\nOptimización: f'=0, f''>0 mínimo\nTVM: ∃c: f'(c) = (f(b)-f(a))/(b-a)\nL'Hôpital para 0/0",
    },
    {
      title: "Grafos — BFS y DFS",
      subject: "Estructuras de Datos",
      is_pinned: false,
      content: "# Grafos\n\nBFS: cola, niveles\nDFS: pila/recursión, profundidad\n\nComplejidad O(V+E)",
    },
    {
      title: "Patrones de diseño básicos",
      subject: "Programación Orientada a Objetos",
      is_pinned: false,
      content: "# Patrones\n\n- Singleton: una instancia\n- Factory: creación encapsulada\n- Observer: notificación de cambios",
    },
    {
      title: "Sistemas numéricos",
      subject: "Introducción a la Computación",
      is_pinned: false,
      content: "# Bases\n\nBinario: 1010₂ = 10₁₀\nHex: A₁₆ = 10₁₀\n\nComplemento a 2 para enteros con signo",
    },
  ];

  const rows = notes.map((n) => {
    const created = new Date(TODAY);
    created.setMonth(created.getMonth() - Math.floor(Math.random() * 8 + 1));
    const updated = new Date(created);
    updated.setDate(updated.getDate() + Math.floor(Math.random() * 20));
    return {
      title: n.title,
      content: n.content,
      subject: n.subject,
      is_pinned: n.is_pinned,
      user_id: DAVID_ID,
      created_at: created.toISOString(),
      update_at: updated.toISOString(),
    };
  });

  await insert("notes", rows);
  console.log(`✓ ${rows.length} notas creadas`);
  return rows.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄  Reset + seed año académico UPC — David Barcelo\n");

  await cleanupDavidData();

  const { upcId, periodIds } = await resolveUpc();
  const scaleId = await getOrCreateScale(upcId);
  const teachers = await getTeachers(upcId);
  const students = await getStudents(upcId);

  if (!teachers.length) {
    throw new Error("No hay profesores en UPC. Ejecuta primero: node scripts/seed-mock-users.js");
  }

  const { courseMap } = await seedCourses(upcId, periodIds, scaleId, teachers, students);
  const groupCount = await seedGroups(courseMap, students);

  console.log("\n📋  Datos personales...");
  const taskCount = await createTasks();
  const eventCount = await createEvents();
  const noteCount = await createNotes();

  await updateDavidProgressAndStats();

  console.log("\n✅  Completado — David simula 1 año académico UPC");
  console.log(`    Cursos: 10 | Grupos: ${groupCount} | Tareas: ${taskCount} | Eventos: ${eventCount} | Notas: ${noteCount}`);
}

main().catch((e) => {
  console.error("💥", e.message);
  process.exit(1);
});
