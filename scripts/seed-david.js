/**
 * Seed script for David Santiago Barcelo Teran (davidbarcelo0411@gmail.com)
 *
 * Simulates an active university student at UNAL:
 *  - Links David to UNAL
 *  - Creates 5 courses with real UNAL mock teachers
 *  - Enrolls David + 30 mock students per course
 *  - Creates assignments (parciales, talleres, proyectos) per course
 *  - Creates graded submissions for David (realistic grades)
 *  - Creates personal tasks, calendar events and study notes
 *
 * Run: node scripts/seed-david.js
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Constants ────────────────────────────────────────────────────────────────

const DAVID_ID    = "6438b565-5e1e-4267-9f5c-b418af15b25f";
const UNAL_ID     = "86a5fda4-c3e6-4bb6-a0d9-034225f6c7b2";
const SUPERADMIN  = "73374c91-8fd9-47aa-b150-bdb14009d856";

const today = new Date();
const d = (offsetDays) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString();
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const insert = async (table, rows, opts = {}) => {
  const { data, error } = await sb.from(table).insert(rows, opts).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};

const rnd = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── 1. Link David to UNAL ────────────────────────────────────────────────────

async function linkDavid() {
  const { error } = await sb.from("users")
    .update({ institution_id: UNAL_ID })
    .eq("id", DAVID_ID);
  if (error) throw error;
  console.log("✓ David linked to UNAL");
}

// ── 2. Academic period ───────────────────────────────────────────────────────

async function createPeriod() {
  // Avoid duplicate
  const { data: existing } = await sb.from("academic_periods")
    .select("id").eq("institution_id", UNAL_ID).eq("name", "2025-I").maybeSingle();
  if (existing) { console.log("↩ Period 2025-I already exists"); return existing.id; }

  const [p] = await insert("academic_periods", {
    institution_id: UNAL_ID,
    name: "2025-I",
    start_date: "2025-02-03",
    end_date:   "2025-06-20",
    is_active:  true,
  });
  console.log(`✓ Period created: ${p.name} (${p.id})`);
  return p.id;
}

// ── 3. Get UNAL teachers ─────────────────────────────────────────────────────

async function getTeachers() {
  const { data } = await sb.from("users")
    .select("id, name")
    .eq("institution_id", UNAL_ID)
    .eq("role", "teacher")
    .limit(5);
  console.log(`✓ Found ${data.length} UNAL teachers`);
  return data;
}

// ── 4. Get UNAL students (excluding David) ───────────────────────────────────

async function getStudents() {
  const { data } = await sb.from("users")
    .select("id, name, email")
    .eq("institution_id", UNAL_ID)
    .eq("role", "student")
    .neq("id", DAVID_ID)
    .limit(150);
  console.log(`✓ Found ${data.length} other UNAL students`);
  return data;
}

// ── 5. Get or create grading scale ──────────────────────────────────────────

async function getOrCreateScale() {
  const { data: existing } = await sb.from("grading_scales")
    .select("id").eq("institution_id", UNAL_ID).maybeSingle();
  if (existing) return existing.id;

  const [s] = await insert("grading_scales", {
    institution_id: UNAL_ID,
    name: "Escala 0-5 UNAL",
    min_score: 0,
    max_score: 5,
    is_default: true,
  });
  return s.id;
}

// ── 6. Create courses ────────────────────────────────────────────────────────

const COURSES_DEF = [
  { title: "Cálculo Diferencial",         description: "Límites, derivadas y aplicaciones. Primer semestre de cálculo para ingeniería." },
  { title: "Fundamentos de Programación", description: "Introducción a la programación estructurada con Python. Algoritmos y estructuras básicas." },
  { title: "Álgebra Lineal",              description: "Matrices, determinantes, espacios vectoriales y transformaciones lineales." },
  { title: "Física Mecánica",             description: "Cinemática, dinámica, trabajo, energía y movimiento oscilatorio." },
  { title: "Introducción a la Computación", description: "Historia, arquitectura de computadores, sistemas operativos y redes." },
];

async function createCourses(teachers, periodId, scaleId) {
  const courses = [];
  for (let i = 0; i < COURSES_DEF.length; i++) {
    const def = COURSES_DEF[i];
    const teacher = teachers[i % teachers.length];

    const [c] = await insert("courses", {
      title:           def.title,
      description:     def.description,
      teacher_id:      teacher.id,
      institution_id:  UNAL_ID,
      invite_code:     randomCode(),
      period_id:       periodId,
      grading_scale_id: scaleId,
    });
    console.log(`  ✓ Course: ${c.title} → teacher: ${teacher.name} (${c.id})`);
    courses.push(c);
  }
  return courses;
}

// ── 7. Enroll students ───────────────────────────────────────────────────────

async function enrollStudents(courses, allStudents) {
  for (const course of courses) {
    // Pick 29 random students + David = 30 total
    const shuffled = [...allStudents].sort(() => Math.random() - 0.5).slice(0, 29);
    const toEnroll = [{ id: DAVID_ID }, ...shuffled];

    const rows = toEnroll.map(s => ({
      course_id:   course.id,
      student_id:  s.id,
      enrolled_at: new Date(today.getTime() - Math.random() * 30 * 86400000).toISOString(),
    }));

    const { error } = await sb.from("course_enrollments").insert(rows);
    if (error) console.warn(`  ⚠ Enrollment error for ${course.title}: ${error.message}`);
    else console.log(`  ✓ Enrolled 30 students in ${course.title}`);
  }
}

// ── 8. Create assignments ────────────────────────────────────────────────────

const ASSIGNMENT_TEMPLATES = [
  { title: "Primer Parcial",      description: "Evaluación escrita de los temas del primer corte.",           days: -20, weight: 30 },
  { title: "Taller 1",            description: "Taller práctico de ejercicios aplicados.",                    days: -10, weight: 15 },
  { title: "Quiz 1",              description: "Evaluación corta sorpresa sobre conceptos fundamentales.",     days: -30, weight: 10 },
  { title: "Segundo Parcial",     description: "Evaluación escrita del segundo corte académico.",              days: 14,  weight: 30 },
  { title: "Proyecto Final",      description: "Proyecto integrador que evidencia las competencias del curso.", days: 35, weight: 45 },
];

async function createAssignments(courses) {
  const allAssignments = [];
  for (const course of courses) {
    const courseAssignments = [];
    for (const tmpl of ASSIGNMENT_TEMPLATES) {
      const [a] = await insert("course_assignments", {
        course_id:   course.id,
        title:       tmpl.title,
        description: tmpl.description,
        due_date:    d(tmpl.days),
      });
      courseAssignments.push({ ...a, daysOffset: tmpl.days });
    }
    allAssignments.push({ course, assignments: courseAssignments });
    console.log(`  ✓ ${courseAssignments.length} assignments for ${course.title}`);
  }
  return allAssignments;
}

// ── 9. Create submissions for David ─────────────────────────────────────────

// Realistic grades per course/assignment (David is a good but not perfect student)
const DAVID_GRADES = {
  "Cálculo Diferencial":           { "Primer Parcial": 3.8, "Taller 1": 4.2, "Quiz 1": 4.5 },
  "Fundamentos de Programación":   { "Primer Parcial": 4.5, "Taller 1": 4.8, "Quiz 1": 5.0 },
  "Álgebra Lineal":                { "Primer Parcial": 3.2, "Taller 1": 3.7, "Quiz 1": 3.5 },
  "Física Mecánica":               { "Primer Parcial": 3.6, "Taller 1": 4.0, "Quiz 1": 3.8 },
  "Introducción a la Computación": { "Primer Parcial": 4.7, "Taller 1": 4.9, "Quiz 1": 4.8 },
};

async function createSubmissions(courseAssignments) {
  for (const { course, assignments } of courseAssignments) {
    const courseGrades = DAVID_GRADES[course.title] ?? {};
    for (const assignment of assignments) {
      const grade = courseGrades[assignment.title];
      // Only submit past assignments (daysOffset < 0) and not the project
      if (assignment.daysOffset >= 0 || assignment.title === "Proyecto Final") continue;

      await insert("assignment_submissions", {
        assignment_id: assignment.id,
        student_id:    DAVID_ID,
        submitted_at:  new Date(today.getTime() + (assignment.daysOffset + 1) * 86400000).toISOString(),
        graded:        grade != null,
        grade:         grade ?? null,
        feedback:      grade != null ? feedbackFor(grade) : null,
        file_url:      null,
      });
    }
    console.log(`  ✓ Submissions created for ${course.title}`);
  }
}

function feedbackFor(grade) {
  if (grade >= 4.5) return "Excelente trabajo. Dominio completo de los temas evaluados.";
  if (grade >= 4.0) return "Muy buen desempeño. Comprensión sólida con pequeños detalles por refinar.";
  if (grade >= 3.5) return "Buen trabajo. Algunos conceptos requieren mayor profundización.";
  return "Aprobado. Necesitas reforzar los fundamentos antes del siguiente parcial.";
}

// ── 10. Tasks for David ──────────────────────────────────────────────────────

async function createTasks() {
  const tasks = [
    { title: "Estudiar para Segundo Parcial de Cálculo",      description: "Repasar regla de la cadena, optimización y teorema del valor medio.", due_date: d(12), priority_id: 1, completed: false },
    { title: "Hacer Taller 2 de Programación",                description: "Ejercicios de recursión y listas enlazadas en Python.", due_date: d(5),  priority_id: 1, completed: false },
    { title: "Leer capítulos 4 y 5 de Álgebra Lineal",        description: "Espacios vectoriales y bases. Ver videos de 3Blue1Brown.", due_date: d(3),  priority_id: 2, completed: false },
    { title: "Preparar presentación de Proyecto Final",        description: "Slides de Introducción a la Computación. Mínimo 10 diapositivas.", due_date: d(30), priority_id: 2, completed: false },
    { title: "Repasar Leyes de Newton para quiz de Física",    description: "Énfasis en la segunda ley y sus aplicaciones.", due_date: d(2),  priority_id: 1, completed: false },
    { title: "Entregar laboratorio de Física",                 description: "Informe del laboratorio de movimiento parabólico.", due_date: d(7),  priority_id: 1, completed: false },
    { title: "Revisar retroalimentación Primer Parcial Álgebra", description: "Entender los errores cometidos y repasar esos temas.", due_date: d(1),  priority_id: 2, completed: false },
    { title: "Inscribir materias siguiente semestre",          description: "Revisar el horario y hacer la pre-inscripción en DNINFOA.", due_date: d(45), priority_id: 3, completed: false },
    { title: "Hacer ejercicios 1-20 del libro de Cálculo",    description: "Sección 3.2 — Derivadas de funciones compuestas.", due_date: d(-1), priority_id: 2, completed: true  },
    { title: "Ver clase grabada de transformaciones lineales", description: "Clase del martes que me perdí. Link en Moodle.", due_date: d(-3), priority_id: 3, completed: true  },
    { title: "Formar grupo para proyecto de Programación",     description: "Hablar con Carlos y Ana sobre el proyecto del semestre.", due_date: d(-5), priority_id: 2, completed: true  },
  ];

  const rows = tasks.map(t => ({
    title:       t.title,
    description: t.description,
    due_date:    t.due_date,
    priority_id: t.priority_id,
    completed:   t.completed,
    user_id:     DAVID_ID,
    created_at:  new Date(today.getTime() - Math.random() * 20 * 86400000).toISOString(),
  }));

  const { error } = await sb.from("tasks").insert(rows);
  if (error) throw new Error(`tasks: ${error.message}`);
  console.log(`✓ ${rows.length} tasks created for David`);
}

// ── 11. Events for David ─────────────────────────────────────────────────────

async function createEvents() {
  const events = [
    // Upcoming exams
    { title: "Segundo Parcial — Cálculo Diferencial",          type: "exam",     start: d(14),  end: d(14),  description: "Salón 302, edificio de Matemáticas. Calculadora no permitida." },
    { title: "Segundo Parcial — Álgebra Lineal",               type: "exam",     start: d(16),  end: d(16),  description: "Salón 105, bloque B. Traer hoja de apuntes." },
    { title: "Quiz Sorpresa — Física Mecánica",                type: "exam",     start: d(4),   end: d(4),   description: "Posible quiz de leyes de Newton en clase." },
    { title: "Segundo Parcial — Fundamentos de Programación",  type: "exam",     start: d(18),  end: d(18),  description: "Laboratorio de computación, edificio Ábaco. Trae tu portátil." },
    { title: "Segundo Parcial — Introducción a la Computación",type: "exam",     start: d(20),  end: d(20),  description: "Salón 201 edificio de Ingeniería de Sistemas." },
    // Assignment deadlines
    { title: "Entrega Taller 2 — Programación",                type: "deadline", start: d(5),   end: d(5),   description: "Subir al campus virtual antes de las 11:59 PM." },
    { title: "Entrega Informe de Laboratorio — Física",        type: "deadline", start: d(7),   end: d(7),   description: "Entregar físicamente al profesor antes de clase." },
    { title: "Entrega Proyecto Final — Computación",           type: "deadline", start: d(35),  end: d(35),  description: "Presentación oral el mismo día. 10 minutos por grupo." },
    // Study sessions
    { title: "Sesión de estudio grupal — Cálculo",             type: "study",    start: d(10),  end: d(10),  description: "Biblioteca Central, sala 4. Con Carlos García y Ana López." },
    { title: "Tutoría con monitor de Álgebra Lineal",          type: "study",    start: d(3),   end: d(3),   description: "Oficina 210, bloque de Matemáticas. 4-6 PM." },
    { title: "Maratón de programación — hackatón UNAL",        type: "academic", start: d(22),  end: d(23),  description: "Evento anual de la facultad de Ingeniería de Sistemas." },
    // University events
    { title: "Semana de Inducción — Clubs universitarios",     type: "academic", start: d(8),   end: d(8),   description: "Plaza Che. Inscribirse al club de robótica y al grupo de estudio." },
    { title: "Feria de prácticas profesionales UNAL",          type: "academic", start: d(50),  end: d(50),  description: "Edificio de Postgrados. Traer hoja de vida actualizada." },
    // Past events
    { title: "Primer Parcial — Cálculo Diferencial",           type: "exam",     start: d(-20), end: d(-20), description: "Resultados: 3.8/5.0 ✓" },
    { title: "Primer Parcial — Fundamentos de Programación",   type: "exam",     start: d(-18), end: d(-18), description: "Resultados: 4.5/5.0 ✓" },
    { title: "Inicio de semestre 2025-I",                      type: "academic", start: d(-60), end: d(-60), description: "Primer día de clases del semestre 2025-I en UNAL." },
  ];

  const rows = events.map(e => ({
    title:       e.title,
    description: e.description,
    start_date:  e.start,
    end_date:    e.end,
    type:        e.type,
    user_id:     DAVID_ID,
    notify:      true,
    is_past:     new Date(e.start) < today,
    metadata:    {},
    created_at:  new Date(today.getTime() - Math.random() * 15 * 86400000).toISOString(),
  }));

  const { error } = await sb.from("events").insert(rows);
  if (error) throw new Error(`events: ${error.message}`);
  console.log(`✓ ${rows.length} events created for David`);
}

// ── 12. Notes for David ──────────────────────────────────────────────────────

async function createNotes() {
  const notes = [
    {
      title: "Derivadas — Reglas esenciales",
      subject: "Cálculo Diferencial",
      is_pinned: true,
      content: `# Reglas de Derivación

## Regla de la potencia
d/dx [x^n] = n·x^(n-1)

## Regla del producto
d/dx [f·g] = f'·g + f·g'

## Regla del cociente
d/dx [f/g] = (f'·g - f·g') / g²

## Regla de la cadena
d/dx [f(g(x))] = f'(g(x))·g'(x)

## Derivadas importantes
- d/dx [sin x] = cos x
- d/dx [cos x] = -sin x
- d/dx [e^x]  = e^x
- d/dx [ln x] = 1/x

## Aplicaciones
- Encontrar máximos/mínimos: f'(x) = 0
- Concavidad: f''(x) > 0 → cóncava arriba
- Teorema de Rolle: si f(a)=f(b) → ∃c: f'(c)=0`,
    },
    {
      title: "Python — Estructuras de datos",
      subject: "Fundamentos de Programación",
      is_pinned: true,
      content: `# Estructuras de Datos en Python

## Listas
frutas = ["manzana", "banano", "pera"]
frutas.append("uva")    # agregar
frutas.pop(0)           # eliminar por índice
len(frutas)             # longitud

## Diccionarios
estudiante = {"nombre": "David", "nota": 4.5, "semestre": 2}
estudiante["carrera"] = "Sistemas"   # agregar clave

## Tuplas (inmutables)
coordenada = (3.14, -2.71)

## Conjuntos (sin duplicados)
numeros = {1, 2, 3, 2, 1}  # {1, 2, 3}

## List comprehension
cuadrados = [x**2 for x in range(10)]
pares     = [x for x in range(20) if x % 2 == 0]

## Recursión
def factorial(n):
    if n <= 1: return 1
    return n * factorial(n - 1)`,
    },
    {
      title: "Álgebra Lineal — Matrices y operaciones",
      subject: "Álgebra Lineal",
      is_pinned: false,
      content: `# Matrices

## Operaciones básicas
- Suma: mismas dimensiones, se suman elemento a elemento
- Multiplicación: A (m×n) × B (n×p) = C (m×p)
- Traspuesta: (A^T)_ij = A_ji

## Determinante 2×2
|a b|
|c d|  = ad - bc

## Determinante 3×3 (Sarrus)
Suma de diagonales principales - suma de diagonales secundarias

## Inversa
A⁻¹ existe si det(A) ≠ 0
A · A⁻¹ = I (matriz identidad)

## Rango
Número de filas/columnas linealmente independientes.
Se calcula con eliminación de Gauss-Jordan.

## Sistemas de ecuaciones
Ax = b
- Si det(A) ≠ 0 → solución única: x = A⁻¹b
- Si det(A) = 0 → sin solución o infinitas soluciones

## Para el parcial
Estudiar: valores propios, vectores propios, diagonalización`,
    },
    {
      title: "Leyes de Newton — Física",
      subject: "Física Mecánica",
      is_pinned: false,
      content: `# Leyes de Newton

## Primera Ley (Inercia)
Un objeto en reposo permanece en reposo, y un objeto en movimiento
permanece en movimiento con velocidad constante, a menos que
actúe una fuerza externa neta.

## Segunda Ley (F = ma)
La aceleración de un objeto es proporcional a la fuerza neta
e inversamente proporcional a su masa.
  F = m·a
  F en Newtons [N], m en kg, a en m/s²

## Tercera Ley (Acción-Reacción)
Para cada acción hay una reacción igual y opuesta.
F_AB = -F_BA

## Aplicaciones
### Plano inclinado
F_normal = m·g·cos(θ)
F_paralela = m·g·sin(θ)
Fricción: f = μ·N

### Movimiento circular
F_centrípeta = m·v²/r = m·ω²·r

## Fórmulas cinemáticas
v = v₀ + a·t
x = x₀ + v₀·t + ½·a·t²
v² = v₀² + 2·a·(x - x₀)`,
    },
    {
      title: "Fórmulas importantes para el parcial de Cálculo",
      subject: "Cálculo Diferencial",
      is_pinned: true,
      content: `# Cheat Sheet — Segundo Parcial Cálculo

## Integrales básicas (si pregunta)
∫ xⁿ dx = xⁿ⁺¹/(n+1) + C
∫ 1/x dx = ln|x| + C
∫ eˣ dx = eˣ + C
∫ sin(x) dx = -cos(x) + C
∫ cos(x) dx = sin(x) + C

## Optimización (muy probable)
1. Encontrar f'(x) = 0 → candidatos a extremo
2. f''(x) > 0 → mínimo local
3. f''(x) < 0 → máximo local
4. Siempre verificar en los extremos del dominio

## Teorema del Valor Medio
Si f continua en [a,b] y derivable en (a,b):
∃ c ∈ (a,b) tal que f'(c) = (f(b)-f(a))/(b-a)

## L'Hôpital (límites 0/0 o ∞/∞)
lim f(x)/g(x) = lim f'(x)/g'(x)

## Función implícita
Derivar ambos lados respecto a x, despejar dy/dx.`,
    },
    {
      title: "Arquitectura de computadores — Resumen",
      subject: "Introducción a la Computación",
      is_pinned: false,
      content: `# Arquitectura de Computadores

## Componentes principales
- CPU: Unidad de procesamiento central
  - ALU (Unidad Aritmético-Lógica)
  - CU (Unidad de Control)
  - Registros
- Memoria:
  - RAM: volátil, acceso rápido
  - ROM: no volátil, solo lectura
  - Caché: L1, L2, L3
- Almacenamiento: HDD, SSD, NVMe
- E/S: teclado, mouse, pantalla, red

## Ciclo de instrucción
1. Fetch: leer instrucción de memoria
2. Decode: decodificar la instrucción
3. Execute: ejecutar la operación
4. Write-back: guardar resultado

## Sistemas numéricos
- Binario (base 2): 1010₂ = 10₁₀
- Octal (base 8): 12₈ = 10₁₀
- Hexadecimal (base 16): A₁₆ = 10₁₀

## Sistemas operativos
- Kernel: núcleo del SO
- Procesos vs Hilos
- Planificación: FCFS, SJF, Round Robin
- Memoria virtual, paginación`,
    },
  ];

  const rows = notes.map(n => ({
    title:      n.title,
    content:    n.content,
    subject:    n.subject,
    is_pinned:  n.is_pinned,
    user_id:    DAVID_ID,
    created_at: new Date(today.getTime() - Math.random() * 40 * 86400000).toISOString(),
    update_at:  new Date(today.getTime() - Math.random() * 5 * 86400000).toISOString(),
  }));

  const { error } = await sb.from("notes").insert(rows);
  if (error) throw new Error(`notes: ${error.message}`);
  console.log(`✓ ${rows.length} study notes created for David`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding David Santiago Barcelo Teran...\n");

  await linkDavid();
  const periodId  = await createPeriod();
  const teachers  = await getTeachers();
  const students  = await getStudents();
  const scaleId   = await getOrCreateScale();

  console.log("\n📚  Creating courses...");
  const courses = await createCourses(teachers, periodId, scaleId);

  console.log("\n👥  Enrolling students...");
  await enrollStudents(courses, students);

  console.log("\n📝  Creating assignments...");
  const courseAssignments = await createAssignments(courses);

  console.log("\n✅  Creating David's submissions (graded)...");
  await createSubmissions(courseAssignments);

  console.log("\n📋  Creating David's tasks...");
  await createTasks();

  console.log("\n📅  Creating David's calendar events...");
  await createEvents();

  console.log("\n📓  Creating David's study notes...");
  await createNotes();

  console.log("\n✅  All done! David is now an active UNAL student.");
  console.log("    Courses: 5  |  Students per course: 30  |  Tasks: 11  |  Events: 17  |  Notes: 6");
}

main().catch(e => { console.error("💥", e.message); process.exit(1); });
