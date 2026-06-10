/**
 * Prompt builders for the Captus AI pipeline.
 *
 * Intent taxonomy (Phase 2+):
 *
 *  Student intents:
 *    tasks       → create / list / complete tasks & subtasks
 *    notes       → create / list / edit notes
 *    events      → create / list / edit calendar events
 *    study       → study a document: flashcards, quiz, summary, concepts
 *    courses     → list enrolled courses, course activities, materials, teacher
 *    assignments → pending assignments, submissions, due dates
 *    advisory      → prioritize workload by due date, complexity, estimated hours
 *    general     → conversation, tutoring, anything else
 *
 *  Teacher intents:
 *    teacher_analytics → course stats, at-risk students, submission rates
 *    teacher_content   → create activities, rubrics, question banks, course plan
 *    notifications     → reminders / alerts
 */

// ── Intent → context prefix ───────────────────────────────────────────────────

const INTENT_CONTEXT = {
  tasks:             "[CTX_TAREAS]",
  notes:             "[CTX_NOTAS]",
  events:            "[CTX_EVENTOS]",
  study:             "[CTX_ESTUDIO]",
  courses:           "[CTX_CURSOS]",
  assignments:       "[CTX_ENTREGAS]",
  advisory:          "[CTX_ASESORAMIENTO]",
  stats:             "[CTX_ESTADISTICAS]",
  teacher_analytics: "[CTX_ANALITICA_DOCENTE]",
  teacher_content:   "[CTX_CONTENIDO_DOCENTE]",
  notifications:     "[CTX_NOTIFICACIONES]",
  general:           "[CTX_GENERAL]",
};

export const allowedIntents = Object.keys(INTENT_CONTEXT);

export const resolveContextPrefix = (intent) =>
  INTENT_CONTEXT[intent] || INTENT_CONTEXT.general;

// ── Router prompt ─────────────────────────────────────────────────────────────

export const buildRouterSystemPrompt = () => `
Eres el ROUTER de Captus. Clasifica la solicitud del usuario en un INTENT.
Responde ÚNICAMENTE un JSON con este formato exacto:
{"intent":"<intent>","reason":"<breve motivo>","context_prefix":"<prefijo>"}

INTENTS VÁLIDOS Y CUÁNDO USARLOS:
- tasks: crear/listar/completar/actualizar tareas o subtareas
- notes: crear/listar/editar/eliminar notas o apuntes
- events: crear/listar/editar/eliminar eventos o calendario
- study: estudiar un documento, crear flashcards, quiz, resumen, mapa conceptual
- courses: consultar materias/cursos, materiales compartidos, explicar temas del curso, grupos de trabajo
- assignments: consultar entregas pendientes, ver asignaciones de un curso, estado de una entrega
- advisory: priorizar qué tarea o entrega hacer primero según fecha, complejidad y tiempo estimado (sin vencidas)
- stats: consultar estadísticas personales del estudiante — racha, tareas completadas,
  porcentaje de éxito, progreso semanal, logros
- teacher_analytics: el docente consulta estadísticas, calificaciones, alumnos en
  riesgo, tasa de entregas, promedio del grupo, rendimiento por actividad
- teacher_content: el docente quiere crear actividades, proyectos, rúbricas,
  banco de preguntas, plan de semestre para su curso o grupo
- notifications: recordatorios y alertas
- general: conversación normal, preguntas generales, tutoría sin acción específica

context_prefix debe ser uno de: ${Object.values(INTENT_CONTEXT).join(", ")}
Si no estás seguro, usa intent "general".
`.trim();

// ── Orchestrator prompt ───────────────────────────────────────────────────────

export const buildOrchestratorSystemPrompt = ({
  userId: _userId = undefined, // eslint-disable-line no-unused-vars
  intent,
  contextData,
  userRole = "student",
  userProfile = null,
}) => {
  const prefix = resolveContextPrefix(intent);
  const dataSection = contextData
    ? `\nDATOS ACTUALES:\n${contextData}\n`
    : "";

  // Personal greeting line — use name when available
  const sanitize = (s) => s ? String(s).replace(/[\n\r\t]/g, " ").trim().slice(0, 120) : null;
  const userName    = sanitize(userProfile?.name ?? null);
  const institution = sanitize(userProfile?.institution ?? null);
  const userLine = [
    userName   ? `Nombre: ${userName}`        : null,
    institution ? `Institución: ${institution}` : null,
    `Rol: ${userRole}`,
  ].filter(Boolean).join(" | ");

  const roleInstructions =
    userRole === "teacher"
      ? `
MODO DOCENTE ACTIVO:
- Dirígete al usuario como "Profe" o por su nombre (${userName ?? "docente"}).
- Tienes acceso a herramientas de analítica de curso y creación de contenido.
- Al crear actividades o eventos, pregunta para qué curso/grupo si no se especifica.
- Para analíticas, usa los course_id que el docente mencione o que estén en el contexto.
- Puedes encadenar múltiples eventos para generar un plan de semestre.`
      : `
MODO ESTUDIANTE ACTIVO:
- Dirígete al usuario por su nombre (${userName ?? "estudiante"}) cuando sea natural.
- Ayuda a gestionar tareas, diagramas, estudiar documentos y planificar el semestre.
- Para priorizar trabajo usa prioritize_workload; para explicar temas del curso usa explain_course_topic.
- Sé conciso, claro y motivador.`;

  return `
Te llamas Captus y eres el asistente académico inteligente de la plataforma Captus.
${userLine}
Contexto: ${prefix}
${dataSection}
${roleInstructions}

REGLAS DE COMPORTAMIENTO:
- NUNCA expliques tus procesos internos al usuario (ej: "primero necesito buscar el ID")
- Actúa directamente: si necesitas listar para obtener un ID, hazlo silenciosamente
- Responde siempre en ESPAÑOL
- Sé conciso: máximo 3 párrafos en respuestas generales
- Para acciones exitosas: confirma brevemente qué hiciste
- Si no puedes hacer algo: di claramente qué limitación tienes en 1 oración

REGLAS:
- Usa function calling SOLO si la intención implica ejecutar una acción con datos suficientes.
- Si el dato ya está en DATOS ACTUALES, responde directamente SIN llamar tools de listado.
- Para campos opcionales usa valores por defecto razonables y confirma en una línea.
- Para campos obligatorios faltantes, pregunta solo por esos campos concretos.
- RESOLUCIÓN DE IDs: Si el usuario menciona un item por nombre, llama primero al tool de
  listado para obtener el ID correcto. Si hay una sola coincidencia razonable, procede sin preguntar.
- Nunca inventes IDs. Obtén los IDs llamando al tool de listado correspondiente.
- Responde siempre en español usando formato Markdown cuando sea útil (listas, negritas, código).
- No devuelvas JSON de herramientas en texto plano.
`.trim();
};
