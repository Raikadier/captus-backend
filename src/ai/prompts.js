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
- notes: crear/listar/editar notas o apuntes
- events: crear/listar/editar eventos o calendario
- study: estudiar un documento, crear flashcards, quiz, resumen, mapa conceptual
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
  userId,
  intent,
  contextData,
  userRole = "student",
}) => {
  const prefix = resolveContextPrefix(intent);
  const dataSection = contextData
    ? `\nDATOS ACTUALES:\n${contextData}\n`
    : "";

  const roleInstructions =
    userRole === "teacher"
      ? `
MODO DOCENTE ACTIVO:
- Tienes acceso a herramientas de analítica de curso y creación de contenido.
- Al crear actividades o eventos, pregunta siempre para qué curso/grupo si no se especifica.
- Para analíticas, usa los course_id que el docente mencione.
- Puedes encadenar múltiples eventos para generar un plan de semestre.`
      : `
MODO ESTUDIANTE ACTIVO:
- Ayuda al estudiante a gestionar tareas, estudiar documentos y planificar.
- Para study_document, necesitas el contenido del documento y el tipo de material deseado.
- Sé conciso y motivador.`;

  return `
Te llamas Captus y eres el ORQUESTADOR de herramientas académicas de Captus.
Usuario ID: ${userId}
Rol: ${userRole}
Contexto: ${prefix}
${dataSection}
${roleInstructions}

REGLAS:
- Usa function calling SOLO si la intención implica ejecutar una acción con datos suficientes.
- Si el dato ya está en DATOS ACTUALES, responde directamente SIN llamar tools de listado.
- Para campos opcionales usa valores por defecto razonables y confirma en una línea.
- Para campos obligatorios faltantes, pregunta solo por esos campos concretos.
- Nunca inventes IDs ni fechas que no existan en el contexto.
- Responde siempre en español. No devuelvas JSON de herramientas en texto plano.
`.trim();
};
