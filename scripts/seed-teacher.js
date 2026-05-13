/**
 * Seed script for teacher davidbarce0411@gmail.com
 *
 * Simulates an active university professor at UNAL:
 *  - Links teacher to UNAL + updates existing courses to that institution
 *  - Creates 2 additional courses (total 4)
 *  - Enrolls 30 UNAL students per course
 *  - Creates assignments (parciales, talleres, proyectos)
 *  - Creates graded submissions for all students (realistic grade distribution)
 *  - Creates teacher tasks (grading, lesson prep, meetings)
 *  - Creates calendar events (classes, office hours, exams, faculty meetings)
 *  - Creates notes (lesson plans, rubrics, course materials)
 *
 * Run: node scripts/seed-teacher.js
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEACHER_ID  = "a82c8181-64af-4b70-94ac-8367b0630810";
const UNAL_ID     = "86a5fda4-c3e6-4bb6-a0d9-034225f6c7b2";
const PERIOD_ID   = "2b4bb8fb-dd85-4c46-87c0-03679af762bd"; // 2025-I created earlier

const today = new Date();
const d = (offsetDays, hour = 8) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
};
const rnd = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const insert = async (table, rows) => {
  const payload = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await sb.from(table).insert(payload).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};

// ── 1. Link teacher to UNAL ─────────────────────────────────────────────────

async function linkTeacher() {
  await sb.from("users").update({ institution_id: UNAL_ID }).eq("id", TEACHER_ID);

  // Get grading scale for UNAL
  const { data: scale } = await sb.from("grading_scales")
    .select("id").eq("institution_id", UNAL_ID).maybeSingle();
  const scaleId = scale?.id;

  // Update existing courses (3 and 4) to belong to UNAL
  for (const cid of [3, 4]) {
    await sb.from("courses").update({
      institution_id:  UNAL_ID,
      period_id:       PERIOD_ID,
      grading_scale_id: scaleId,
    }).eq("id", cid);
  }
  console.log("✓ Teacher linked to UNAL, courses 3 & 4 updated");
  return scaleId;
}

// ── 2. Create 2 more courses ─────────────────────────────────────────────────

async function createExtraCourses(scaleId) {
  const defs = [
    { title: "Cálculo Integral",        description: "Integral definida e indefinida, técnicas de integración, aplicaciones al área y volumen." },
    { title: "Ecuaciones Diferenciales",description: "EDO de primer y segundo orden, sistemas de ecuaciones, métodos numéricos y aplicaciones." },
  ];
  const courses = [];
  for (const def of defs) {
    const [c] = await insert("courses", {
      title:           def.title,
      description:     def.description,
      teacher_id:      TEACHER_ID,
      institution_id:  UNAL_ID,
      invite_code:     randomCode(),
      period_id:       PERIOD_ID,
      grading_scale_id: scaleId,
    });
    console.log(`  ✓ New course: ${c.title} (${c.id})`);
    courses.push(c);
  }
  return courses;
}

// ── 3. Enroll students ───────────────────────────────────────────────────────

async function enrollStudents(courseIds) {
  const { data: pool } = await sb.from("users")
    .select("id, name")
    .eq("institution_id", UNAL_ID)
    .eq("role", "student")
    .limit(150);

  for (const cid of courseIds) {
    // Check existing enrollments
    const { data: existing } = await sb.from("course_enrollments")
      .select("student_id").eq("course_id", cid);
    const alreadyIn = new Set((existing ?? []).map(e => e.student_id));

    const newStudents = pool
      .filter(s => !alreadyIn.has(s.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 30 - alreadyIn.size);

    if (newStudents.length === 0) {
      console.log(`  ↩ Course ${cid} already has students`);
      continue;
    }

    const rows = newStudents.map(s => ({
      course_id:   cid,
      student_id:  s.id,
      enrolled_at: new Date(today.getTime() - Math.random() * 30 * 86400000).toISOString(),
    }));
    const { error } = await sb.from("course_enrollments").insert(rows);
    if (error) console.warn(`  ⚠ Enroll error course ${cid}: ${error.message}`);
    else console.log(`  ✓ Enrolled ${rows.length} students in course ${cid}`);
  }
  return pool;
}

// ── 4. Create assignments per course ────────────────────────────────────────

const ASSIGN_TEMPLATES = [
  { title: "Primer Parcial",   description: "Evaluación del primer corte. Temas: conceptos fundamentales y ejercicios básicos.", days: -25, graded: true  },
  { title: "Taller 1",         description: "Taller de ejercicios aplicados. Trabajo individual.",                                days: -15, graded: true  },
  { title: "Quiz 1",           description: "Evaluación corta de 20 minutos sobre los temas de las primeras semanas.",            days: -35, graded: true  },
  { title: "Segundo Parcial",  description: "Evaluación del segundo corte académico.",                                            days:  12, graded: false },
  { title: "Proyecto Final",   description: "Proyecto integrador. Se entrega informe escrito y se realiza presentación oral.",    days:  38, graded: false },
];

async function createAssignments(courseIds) {
  const result = {};
  for (const cid of courseIds) {
    const { data: existing } = await sb.from("course_assignments")
      .select("title").eq("course_id", cid);
    const existingTitles = new Set((existing ?? []).map(a => a.title));

    const toCreate = ASSIGN_TEMPLATES.filter(t => !existingTitles.has(t.title));
    if (toCreate.length === 0) { console.log(`  ↩ Course ${cid} already has assignments`); }

    const created = [];
    for (const tmpl of toCreate) {
      const [a] = await insert("course_assignments", {
        course_id:   cid,
        title:       tmpl.title,
        description: tmpl.description,
        due_date:    d(tmpl.days),
      });
      created.push({ ...a, graded: tmpl.graded, days: tmpl.days });
    }

    // Also fetch existing ones
    const { data: allAssigns } = await sb.from("course_assignments")
      .select("id, title").eq("course_id", cid);
    result[cid] = allAssigns.map(a => {
      const tmpl = ASSIGN_TEMPLATES.find(t => t.title === a.title);
      return { ...a, graded: tmpl?.graded ?? false, days: tmpl?.days ?? -1 };
    });

    console.log(`  ✓ Assignments for course ${cid}: ${result[cid].length}`);
  }
  return result;
}

// ── 5. Create graded submissions for all students ────────────────────────────

// Grade distribution: realistic bell curve
function randomGrade(courseTitle) {
  const r = Math.random();
  // Calculo harder, Sistemas easier
  const base = courseTitle.includes("Ecuaciones") || courseTitle.includes("Integral") ? 0.15
             : courseTitle.includes("Discretas") || courseTitle.includes("Calculo I") || courseTitle.includes("Diferencial") ? 0.20
             : 0.10;

  if (r < base)       return rnd(1.0, 2.9);   // failing
  if (r < base + 0.25) return rnd(3.0, 3.4);  // barely passing
  if (r < base + 0.55) return rnd(3.5, 4.2);  // average
  if (r < base + 0.80) return rnd(4.3, 4.7);  // good
  return rnd(4.8, 5.0);                        // excellent
}

async function createSubmissions(courseIds, assignmentsByCourse) {
  for (const cid of courseIds) {
    const { data: course } = await sb.from("courses").select("title").eq("id", cid).single();
    const { data: enrollments } = await sb.from("course_enrollments")
      .select("student_id").eq("course_id", cid);

    const pastAssigns = (assignmentsByCourse[cid] ?? []).filter(a => a.days < 0);

    let count = 0;
    for (const assign of pastAssigns) {
      // Check existing submissions
      const { data: existing } = await sb.from("assignment_submissions")
        .select("student_id").eq("assignment_id", assign.id);
      const alreadySubmitted = new Set((existing ?? []).map(s => s.student_id));

      const rows = enrollments
        .filter(e => !alreadySubmitted.has(e.student_id))
        .map(e => {
          const grade = randomGrade(course?.title ?? "");
          return {
            assignment_id: assign.id,
            student_id:    e.student_id,
            submitted_at:  new Date(today.getTime() + (assign.days + 0.5) * 86400000).toISOString(),
            graded:        true,
            grade:         grade,
            feedback:      feedbackFor(grade),
            file_url:      null,
          };
        });

      if (rows.length > 0) {
        const { error } = await sb.from("assignment_submissions").insert(rows);
        if (!error) count += rows.length;
        else console.warn(`  ⚠ Submission error: ${error.message}`);
      }
    }
    console.log(`  ✓ ${count} submissions created for course ${cid} (${course?.title})`);
  }
}

function feedbackFor(grade) {
  if (grade >= 4.8) return "Desempeño sobresaliente. Dominio completo de todos los temas evaluados.";
  if (grade >= 4.3) return "Muy buen trabajo. Muestra comprensión sólida y habilidad para resolver problemas.";
  if (grade >= 3.5) return "Buen desempeño general. Reforzar los temas donde hubo dificultades.";
  if (grade >= 3.0) return "Aprobado. Es fundamental repasar los conceptos básicos antes del próximo parcial.";
  return "Resultado insuficiente. Se recomienda asesoría con el monitor o asistir a tutoría.";
}

// ── 6. Teacher tasks ─────────────────────────────────────────────────────────

async function createTasks() {
  const tasks = [
    { title: "Preparar segundo parcial — Cálculo Diferencial",    description: "Redactar el examen con 5 problemas. Revisar nivel de dificultad con colega.", due_date: d(8),  priority_id: 1, completed: false },
    { title: "Calificar Taller 2 — Ecuaciones Diferenciales",     description: "30 talleres por revisar. Subir notas al sistema antes del viernes.",          due_date: d(3),  priority_id: 1, completed: false },
    { title: "Preparar clase: transformaciones de Laplace",       description: "Preparar diapositivas y 3 ejemplos resueltos para la clase del martes.",       due_date: d(1),  priority_id: 2, completed: false },
    { title: "Enviar reporte de notas del primer corte",          description: "Consolidar notas en el sistema académico DNINFOA. Plazo: viernes 5pm.",        due_date: d(4),  priority_id: 1, completed: false },
    { title: "Revisar proyecto final — Cálculo Integral",         description: "Leer 8 propuestas de proyecto y dar retroalimentación escrita.",               due_date: d(12), priority_id: 2, completed: false },
    { title: "Preparar material de integración por partes",       description: "Ejercicios adicionales para los estudiantes con dificultades.",                due_date: d(2),  priority_id: 2, completed: false },
    { title: "Junta de profesores del departamento",              description: "Preparar informe de avance curricular del semestre.",                          due_date: d(6),  priority_id: 3, completed: false },
    { title: "Actualizar rúbrica del proyecto final",             description: "Incluir criterios de presentación oral sugeridos por el coordinador.",        due_date: d(15), priority_id: 3, completed: false },
    { title: "Subir material semana 10 al campus virtual",        description: "Videos, PDF y ejercicios propuestos para autoaprendizaje.",                    due_date: d(5),  priority_id: 2, completed: false },
    { title: "Responder correos de estudiantes — pendientes",     description: "8 correos sin responder. Priorizar los de duda sobre el parcial.",            due_date: d(0),  priority_id: 1, completed: false },
    // Completed
    { title: "Calificar Primer Parcial — Cálculo Diferencial",    description: "Notas ya subidas al sistema. ✓",                                              due_date: d(-5), priority_id: 1, completed: true },
    { title: "Publicar soluciones Quiz 1 en campus virtual",      description: "Soluciones detalladas publicadas. ✓",                                         due_date: d(-8), priority_id: 2, completed: true },
    { title: "Entregar plan del curso al coordinador",            description: "Enviado y aprobado el 15 de febrero. ✓",                                      due_date: d(-40),priority_id: 1, completed: true },
    { title: "Registrar estudiantes en DNINFOA",                  description: "Todos los estudiantes registrados en el sistema. ✓",                          due_date: d(-28),priority_id: 1, completed: true },
  ];

  const rows = tasks.map(t => ({
    title:       t.title,
    description: t.description,
    due_date:    t.due_date,
    priority_id: t.priority_id,
    completed:   t.completed,
    user_id:     TEACHER_ID,
    created_at:  new Date(today.getTime() - Math.random() * 25 * 86400000).toISOString(),
  }));

  const { error } = await sb.from("tasks").insert(rows);
  if (error) throw new Error(`tasks: ${error.message}`);
  console.log(`✓ ${rows.length} teacher tasks created`);
}

// ── 7. Calendar events ───────────────────────────────────────────────────────

async function createEvents() {
  // Helper: class event (Mon/Wed/Fri)
  const classDay = (offsetDays, h) => d(offsetDays, h);

  const events = [
    // Regular class sessions (next 2 weeks)
    { title: "Clase Cálculo Diferencial — Grupo A",           type: "class",   start: d(1,7),   end: d(1,9),   description: "Salón 302 Ed. Matemáticas. Tema: regla de la cadena." },
    { title: "Clase Ecuaciones Diferenciales",                type: "class",   start: d(2,9),   end: d(2,11),  description: "Salón 105 bloque B. Tema: solución de EDO separables." },
    { title: "Clase Cálculo Integral",                        type: "class",   start: d(3,7),   end: d(3,9),   description: "Aula 201 Ed. Ingeniería. Tema: integración por partes." },
    { title: "Clase Matemáticas Discretas",                   type: "class",   start: d(4,14),  end: d(4,16),  description: "Salón 304. Tema: inducción matemática." },
    { title: "Clase Cálculo Diferencial — Grupo A",           type: "class",   start: d(6,7),   end: d(6,9),   description: "Continuación: optimización y problemas aplicados." },
    { title: "Clase Ecuaciones Diferenciales",                type: "class",   start: d(7,9),   end: d(7,11),  description: "Ecuaciones de Bernoulli y aplicaciones." },
    { title: "Clase Cálculo Integral",                        type: "class",   start: d(8,7),   end: d(8,9),   description: "Integrales trigonométricas y sustitución." },
    { title: "Clase Matemáticas Discretas",                   type: "class",   start: d(9,14),  end: d(9,16),  description: "Teoría de grafos — conceptos básicos." },
    { title: "Clase Cálculo Diferencial — Grupo A",           type: "class",   start: d(13,7),  end: d(13,9),  description: "Teorema del valor medio y aplicaciones." },
    // Office hours
    { title: "Horas de atención a estudiantes",               type: "office",  start: d(1,14),  end: d(1,16),  description: "Oficina 412 Ed. Matemáticas. Consultas de cualquier materia." },
    { title: "Horas de atención a estudiantes",               type: "office",  start: d(3,14),  end: d(3,16),  description: "Oficina 412 Ed. Matemáticas." },
    { title: "Horas de atención a estudiantes",               type: "office",  start: d(8,14),  end: d(8,16),  description: "Oficina 412 Ed. Matemáticas." },
    // Exams
    { title: "Segundo Parcial — Cálculo Diferencial",         type: "exam",    start: d(12,7),  end: d(12,10), description: "Examen presencial. 30% de la nota final. Calculadora permitida." },
    { title: "Segundo Parcial — Cálculo Integral",            type: "exam",    start: d(14,9),  end: d(14,12), description: "Examen presencial. Salón 301." },
    { title: "Segundo Parcial — Ecuaciones Diferenciales",    type: "exam",    start: d(16,7),  end: d(16,10), description: "Examen escrito. Traer hoja de fórmulas autorizada." },
    // Faculty/Admin
    { title: "Junta de Profesores — Dpto. Matemáticas",       type: "meeting", start: d(6,12),  end: d(6,14),  description: "Sala de juntas 3er piso. Orden del día: revisión planes de curso." },
    { title: "Comité de currículo — Facultad de Ingeniería",  type: "meeting", start: d(20,10), end: d(20,12), description: "Propuesta de nuevo curso electivo de IA aplicada." },
    { title: "Entrega notas primer corte — Sistema DNINFOA",  type: "deadline",start: d(4,17),  end: d(4,17),  description: "Plazo máximo para registrar notas del primer corte (30%)." },
    { title: "Entrega propuesta proyectos finales",           type: "deadline",start: d(18,17), end: d(18,17), description: "Los grupos deben enviar propuesta al correo antes de las 5pm." },
    // Presentations/seminars
    { title: "Seminario: Métodos numéricos aplicados",        type: "academic",start: d(10,9),  end: d(10,11), description: "Auditorio Facultad. Invitado: Prof. Jorge Arango, Univ. del Valle." },
    { title: "Presentaciones Proyecto Final — Cálculo Int.",  type: "exam",    start: d(38,8),  end: d(38,18), description: "Todos los grupos presentan en el laboratorio. 10 min c/u." },
    // Past events
    { title: "Primer Parcial — Cálculo Diferencial",          type: "exam",    start: d(-25,7), end: d(-25,10),description: "Completado. Promedio del grupo: 3.8/5.0" },
    { title: "Primer Parcial — Ecuaciones Diferenciales",     type: "exam",    start: d(-22,9), end: d(-22,12),description: "Completado. Promedio del grupo: 3.5/5.0" },
    { title: "Inicio de semestre 2025-I",                     type: "academic",start: d(-60,8), end: d(-60,8), description: "Primera semana de clases. Presentación del programa del curso." },
  ];

  const rows = events.map(e => ({
    title:       e.title,
    description: e.description,
    start_date:  e.start,
    end_date:    e.end,
    type:        e.type,
    user_id:     TEACHER_ID,
    notify:      true,
    is_past:     new Date(e.start) < today,
    metadata:    {},
    created_at:  new Date(today.getTime() - Math.random() * 20 * 86400000).toISOString(),
  }));

  const { error } = await sb.from("events").insert(rows);
  if (error) throw new Error(`events: ${error.message}`);
  console.log(`✓ ${rows.length} calendar events created`);
}

// ── 8. Teacher notes ─────────────────────────────────────────────────────────

async function createNotes() {
  const notes = [
    {
      title: "Plan del curso — Cálculo Diferencial 2025-I",
      subject: "Cálculo Diferencial",
      is_pinned: true,
      content: `# Cálculo Diferencial — Plan de Curso 2025-I

## Objetivos
Al finalizar el curso el estudiante será capaz de:
- Calcular límites y determinar continuidad de funciones
- Aplicar las reglas de derivación
- Resolver problemas de optimización y análisis de funciones
- Interpretar geométricamente la derivada

## Distribución de notas
- Primer Parcial:  30%
- Segundo Parcial: 30%
- Proyecto Final:  20%
- Talleres/Quices: 20%

## Cronograma semestral
Semanas 1-4:  Límites y continuidad
Semanas 5-8:  Derivadas y reglas de derivación
Semanas 9-12: Aplicaciones de la derivada
Semanas 13-16: Optimización y repaso

## Bibliografía
- Stewart, J. (2015). Cálculo. 8va edición. Cengage Learning.
- Larson, R. & Edwards, B. (2014). Cálculo. 10ma edición. McGraw-Hill.`,
    },
    {
      title: "Rúbrica — Proyecto Final Cálculo Integral",
      subject: "Cálculo Integral",
      is_pinned: true,
      content: `# Rúbrica Proyecto Final — Cálculo Integral

## Criterios de evaluación (total: 5.0)

### 1. Planteamiento del problema (1.0 pts)
- 1.0: Problema claramente definido con contexto real y relevante
- 0.7: Problema definido pero contexto poco claro
- 0.4: Problema vago o sin justificación

### 2. Desarrollo matemático (2.0 pts)
- 2.0: Procedimiento correcto y completo, sin errores
- 1.5: Procedimiento correcto con errores menores
- 1.0: Procedimiento parcialmente correcto
- 0.5: Intento de solución pero con errores conceptuales

### 3. Interpretación y conclusiones (1.0 pts)
- 1.0: Interpretación correcta y profunda de resultados
- 0.7: Interpretación correcta pero superficial
- 0.4: Interpretación incorrecta o ausente

### 4. Presentación oral (1.0 pts)
- 1.0: Clara, organizada, manejo del tiempo, responde preguntas
- 0.7: Clara y organizada pero dificultades con preguntas
- 0.4: Presentación desorganizada o incompleta`,
    },
    {
      title: "Estrategias para estudiantes en riesgo",
      subject: "Pedagogía",
      is_pinned: true,
      content: `# Protocolo: Estudiantes en Riesgo Académico

## Identificación (semana 6-8)
- Nota primer parcial < 3.0
- Asistencia < 70%
- No entrega de talleres

## Acciones inmediatas
1. Contactar al estudiante por correo (plantilla en carpeta Drive)
2. Invitar a horario de atención personalizado
3. Conectar con monitor del curso (Andrés Gómez, ext. 2341)
4. Notificar a bienestar universitario si el caso es grave

## Seguimiento
- Semana 9: revisión de progreso
- Semana 12: decisión de recuperación
- Examen de habilitación: solo para quien obtenga entre 2.5-3.0

## Casos especiales este semestre
- Calculo Diferencial Grupo A: 4 estudiantes en riesgo
- Ecuaciones: 3 estudiantes con nota < 2.5 en primer parcial
- Acción: tutoría grupal todos los jueves 4-6pm (confirmado con bienestar)`,
    },
    {
      title: "Preparación clase: Transformada de Laplace",
      subject: "Ecuaciones Diferenciales",
      is_pinned: false,
      content: `# Clase: Transformada de Laplace

## Objetivo de la clase
Introducir la transformada de Laplace como herramienta para resolver EDO con condiciones iniciales.

## Agenda (2 horas)
- 0:00-0:20 — Repaso: EDO de segundo orden, motivación
- 0:20-0:45 — Definición de la transformada L{f(t)}
- 0:45-1:15 — Tabla de transformadas + propiedades clave
- 1:15-1:45 — Ejemplos resueltos (3 problemas)
- 1:45-2:00 — Preguntas y tarea para la próxima clase

## Transformadas esenciales
L{1} = 1/s
L{t^n} = n!/s^(n+1)
L{e^(at)} = 1/(s-a)
L{sin(wt)} = w/(s²+w²)
L{cos(wt)} = s/(s²+w²)

## Problema de práctica sugerido
Resolver: y'' + 3y' + 2y = e^(-t), y(0)=0, y'(0)=1 usando Laplace.

## Recursos para compartir
- Video 3Blue1Brown: "Differential Equations and Laplace Transforms"
- Ejercicios Schaum capítulo 7`,
    },
    {
      title: "Ideas para proyecto semestral — Mat. Discretas",
      subject: "Matemáticas Discretas",
      is_pinned: false,
      content: `# Proyectos Sugeridos — Matemáticas Discretas

## Opción 1: Algoritmos de grafos
Implementar BFS/DFS y aplicarlo a un problema real (rutas de transporte urbano en Bogotá). Lenguaje libre.

## Opción 2: Criptografía básica
Implementar RSA con números grandes. Explicar la base matemática (aritmética modular, Euler, Fermat).

## Opción 3: Teoría de códigos
Implementar un código de Hamming (7,4). Demostrar corrección de errores.

## Opción 4: Árbol de decisión
Construir un árbol de decisión para clasificación. Analizar complejidad.

## Opción 5: Coloración de grafos
Algoritmo de coloración y aplicación al problema de asignación de horarios de clases.

## Criterios de selección
- Máximo 2 estudiantes por grupo
- Tema debe ser aprobado por el docente antes de semana 9
- Lenguaje de programación: Python, Java o C++`,
    },
    {
      title: "Notas reunión departamento — Feb 2025",
      subject: "Administración",
      is_pinned: false,
      content: `# Reunión Dpto. Matemáticas — 14 feb 2025

## Asistentes
Prof. María García (jefe dpto.), Prof. David Barcelo, Prof. Luis Torres, Prof. Ana Ospina, Prof. Jorge Vargas

## Acuerdos
1. Unificar criterios de evaluación para Cálculo I y II (ponderación idéntica en todos los grupos)
2. Nuevo horario de monitores: lunes y miércoles 2-5pm, sala de monitores bloque C
3. Implementar encuesta de medio semestre (semana 9) para detectar dificultades a tiempo
4. Próxima reunión: 28 de marzo, 10am, sala de juntas

## Pendientes
- Prof. Barcelo: entregar propuesta de electiva "Matemáticas para ML" antes del 15 de marzo
- Prof. Torres: coordinar con sistemas el nuevo software de graficación
- Todos: reportar casos de riesgo académico antes de semana 8`,
    },
  ];

  const rows = notes.map(n => ({
    title:      n.title,
    content:    n.content,
    subject:    n.subject,
    is_pinned:  n.is_pinned,
    user_id:    TEACHER_ID,
    created_at: new Date(today.getTime() - Math.random() * 45 * 86400000).toISOString(),
    update_at:  new Date(today.getTime() - Math.random() * 7 * 86400000).toISOString(),
  }));

  const { error } = await sb.from("notes").insert(rows);
  if (error) throw new Error(`notes: ${error.message}`);
  console.log(`✓ ${rows.length} teacher notes created`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding teacher davidbarce0411@gmail.com...\n");

  const scaleId = await linkTeacher();

  console.log("\n📚  Creating 2 additional courses...");
  await createExtraCourses(scaleId);

  // All 4 teacher course IDs
  const { data: teacherCourses } = await sb.from("courses")
    .select("id, title")
    .eq("teacher_id", TEACHER_ID)
    .eq("institution_id", UNAL_ID);
  const courseIds = teacherCourses.map(c => c.id);
  console.log(`\n📋  Teacher has ${courseIds.length} courses: ${courseIds.join(", ")}`);

  console.log("\n👥  Enrolling students...");
  await enrollStudents(courseIds);

  console.log("\n📝  Creating/verifying assignments...");
  const assignmentsByCourse = await createAssignments(courseIds);

  console.log("\n✅  Creating graded submissions for all students...");
  await createSubmissions(courseIds, assignmentsByCourse);

  console.log("\n📋  Creating teacher tasks...");
  await createTasks();

  console.log("\n📅  Creating calendar events...");
  await createEvents();

  console.log("\n📓  Creating teacher notes...");
  await createNotes();

  // Summary
  console.log("\n" + "═".repeat(55));
  for (const c of teacherCourses) {
    const { count: enrolled } = await sb.from("course_enrollments")
      .select("*", { count: "exact", head: true }).eq("course_id", c.id);
    const { count: submissions } = await sb.from("assignment_submissions")
      .select("*", { count: "exact", head: true })
      .in("assignment_id",
        (await sb.from("course_assignments").select("id").eq("course_id", c.id)).data.map(a => a.id));
    console.log(`  ${c.title} (${c.id}): ${enrolled} estudiantes, ${submissions} submissions`);
  }
  console.log("═".repeat(55));
  console.log("✅  Teacher profile complete!");
}

main().catch(e => { console.error("💥", e.message); process.exit(1); });
