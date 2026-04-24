import { TaskService } from "../services/TaskService.js";
import { NotesService } from "../services/NotesService.js";
import { EventsService } from "../services/EventsService.js";
import CourseService from "../services/CourseService.js";
import SubmissionService from "../services/SubmissionService.js";
import EnrollmentService from "../services/EnrollmentService.js";
import { createChatCompletion, MODEL_STUDY } from "./model.js";
import { OperationResult } from "../shared/OperationResult.js";

const taskService = new TaskService();
const notesService = new NotesService();
const eventsService = new EventsService();
const courseService = new CourseService();
const submissionService = new SubmissionService();
const enrollmentService = new EnrollmentService();

const validateArgs = (schema, args = {}) => {
  const errors = [];
  const normalized = {};

  for (const [key, rule] of Object.entries(schema.properties)) {
    const value = args[key];
    if (value === undefined || value === null) {
      if (schema.required?.includes(key)) {
        errors.push(`${key} es requerido`);
      }
      continue;
    }

    if (rule.type === "string" && typeof value !== "string") {
      errors.push(`${key} debe ser texto`);
    }
    if (rule.type === "number" && typeof value !== "number") {
      errors.push(`${key} debe ser numérico`);
    }
    if (rule.type === "boolean") {
      if (typeof value === "boolean") {
        normalized[key] = value;
        continue;
      }
      if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true") {
          normalized[key] = true;
          continue;
        }
        if (lower === "false") {
          normalized[key] = false;
          continue;
        }
      }
      if (typeof value === "number") {
        if (value === 1) {
          normalized[key] = true;
          continue;
        }
        if (value === 0) {
          normalized[key] = false;
          continue;
        }
      }
      errors.push(`${key} debe ser booleano`);
      continue;
    }
    if (rule.format === "date-time") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        errors.push(`${key} debe ser fecha ISO válida`);
      }
    }

    normalized[key] = typeof value === "string" ? value.trim() : value;
  }

  return { ok: errors.length === 0, errors, value: normalized };
};

const wrapResult = (tool, result) => {
  if (!result) {
    return new OperationResult(false, "No se obtuvo respuesta de la herramienta");
  }
  if (result instanceof OperationResult) return result;

  // Allow returning raw strings for success
  return new OperationResult(true, String(result), result?.data ?? null);
};

export const toolRegistry = {
  create_task: {
    description: "Crea una tarea con título, descripción opcional, fecha límite ISO y prioridad_id opcional.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título de la tarea" },
        description: { type: "string", description: "Descripción corta", default: "" },
        due_date: { type: "string", description: "Fecha límite en ISO 8601", format: "date-time" },
        priority_id: { type: "number", description: "Prioridad (por defecto 1)" },
        category_id: { type: "number", description: "Categoría opcional" },
      },
      required: ["title", "due_date"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(toolRegistry.create_task.parameters, args);
      if (!validation.ok) return new OperationResult(false, validation.errors.join("; "));

      const payload = {
        title: validation.value.title,
        description: validation.value.description || "",
        due_date: validation.value.due_date,
        priority_id: validation.value.priority_id ?? 1,
        category_id: validation.value.category_id ?? null,
      };

      const result = await taskService.save(payload, { id: userId });
      return wrapResult("create_task", result);
    },
  },
  complete_task: {
    description: "Marca una tarea como completada por id.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "number", description: "ID de la tarea a completar" },
      },
      required: ["task_id"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(toolRegistry.complete_task.parameters, args);
      if (!validation.ok) return new OperationResult(false, validation.errors.join("; "));

      const result = await taskService.complete(validation.value.task_id, { id: userId });
      return wrapResult("complete_task", result);
    },
  },
  list_tasks: {
    description: "Lista tareas pendientes del usuario (máx 10).",
    parameters: {
      type: "object",
      properties: {
        includeCompleted: { type: "boolean", description: "Incluir completadas" },
      },
    },
    handler: async (args, userId) => {
      const includeCompleted = Boolean(args?.includeCompleted);
      const result = await taskService.getTasksForAi({ includeCompleted, limit: 10 }, { id: userId });
      if (result.success) {
        const tasks = result.data || [];
        const message = tasks.length
          ? tasks.map((t) => `• ${t.title}${t.due_date ? ` (vence ${new Date(t.due_date).toLocaleDateString("es-ES")})` : ""}${t.completed ? " ✅" : ""}`).join("\n")
          : "No hay tareas pendientes.";
        return new OperationResult(true, message, tasks);
      }
      return result;
    },
  },
  create_note: {
    description: "Crea una nota con título y contenido opcional.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título de la nota" },
        content: { type: "string", description: "Contenido de la nota" },
        subject: { type: "string", description: "Etiqueta o materia" },
      },
      required: ["title"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(toolRegistry.create_note.parameters, args);
      if (!validation.ok) return new OperationResult(false, validation.errors.join("; "));

      const payload = {
        title: validation.value.title,
        content: validation.value.content ?? "",
        subject: validation.value.subject ?? null,
      };
      const result = await notesService.save(payload, { id: userId });
      return wrapResult("create_note", result);
    },
  },
  update_note: {
    description: "Actualiza una nota existente. Requiere note_id y campos a modificar.",
    parameters: {
      type: "object",
      properties: {
        note_id: { type: "number", description: "ID de la nota" },
        title: { type: "string", description: "Nuevo título" },
        content: { type: "string", description: "Nuevo contenido" },
        subject: { type: "string", description: "Nueva materia/etiqueta" },
      },
      required: ["note_id"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(toolRegistry.update_note.parameters, args);
      if (!validation.ok) return new OperationResult(false, validation.errors.join("; "));

      const payload = {
        id: validation.value.note_id,
        title: validation.value.title,
        content: validation.value.content,
        subject: validation.value.subject,
      };
      const result = await notesService.update(payload, { id: userId });
      return wrapResult("update_note", result);
    },
  },
  list_notes: {
    description: "Lista notas del usuario (ordenadas por fijadas y última edición).",
    parameters: { type: "object", properties: {} },
    handler: async (_args, userId) => {
      const result = await notesService.getAll({ id: userId });
      if (result.success) {
        const notes = result.data || [];
        const message = notes.length
          ? notes.map((n) => `• ${n.title}${n.is_pinned ? " 📌" : ""}`).join("\n")
          : "No hay notas registradas.";
        return new OperationResult(true, message, notes);
      }
      return result;
    },
  },
  create_event: {
    description: "Crea un evento con título, fecha/hora de inicio y tipo.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título del evento" },
        description: { type: "string", description: "Descripción" },
        start_date: { type: "string", description: "Fecha de inicio ISO 8601", format: "date-time" },
        end_date: { type: "string", description: "Fecha de fin ISO 8601", format: "date-time" },
        type: { type: "string", description: "Tipo de evento, ej: personal" },
        notify: { type: "boolean", description: "Enviar recordatorio" },
      },
      required: ["title", "start_date", "type"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(toolRegistry.create_event.parameters, args);
      if (!validation.ok) return new OperationResult(false, validation.errors.join("; "));

      const payload = {
        title: validation.value.title,
        description: validation.value.description ?? "",
        start_date: validation.value.start_date,
        end_date: validation.value.end_date ?? null,
        type: validation.value.type || "personal",
        notify: Boolean(args?.notify),
      };
      const result = await eventsService.save(payload, { id: userId });
      return wrapResult("create_event", result);
    },
  },
  update_event: {
    description: "Actualiza un evento existente por id.",
    parameters: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "ID del evento" },
        title: { type: "string" },
        description: { type: "string" },
        start_date: { type: "string", format: "date-time" },
        end_date: { type: "string", format: "date-time" },
        type: { type: "string" },
        notify: { type: "boolean" },
      },
      required: ["event_id"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(toolRegistry.update_event.parameters, args);
      if (!validation.ok) return new OperationResult(false, validation.errors.join("; "));

      const payload = {
        id: validation.value.event_id,
        title: validation.value.title,
        description: validation.value.description,
        start_date: validation.value.start_date,
        end_date: validation.value.end_date,
        type: validation.value.type,
        notify: args?.notify,
      };

      const result = await eventsService.update(payload, { id: userId });
      return wrapResult("update_event", result);
    },
  },
  list_events: {
    description: "Lista próximos eventos del usuario (máx 10).",
    parameters: { type: "object", properties: {} },
    handler: async (_args, userId) => {
      const result = await eventsService.getUpcoming({ limit: 10 }, { id: userId });
      if (result.success) {
        const events = result.data || [];
        const message = events.length
          ? events.map((e) => `• ${e.title} (${new Date(e.start_date).toLocaleString("es-ES")})`).join("\n")
          : "No tienes eventos próximos.";
        return new OperationResult(true, message, events);
      }
      return result;
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT — Study tools (Phase 2)
  // ════════════════════════════════════════════════════════════════════════════

  study_document: {
    description:
      "Procesa el contenido de un documento y genera material de estudio: " +
      "flashcards, quiz de opción múltiple, resumen ejecutivo o mapa de conceptos. " +
      "Requiere que el cliente envíe el texto del documento.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Texto completo del documento a estudiar (hasta 500k tokens)",
        },
        type: {
          type: "string",
          description:
            "Tipo de material: 'flashcards' | 'quiz' | 'summary' | 'concepts'",
        },
        subject: {
          type: "string",
          description: "Materia o contexto del documento (ej: 'Estructuras de Datos')",
        },
        language: {
          type: "string",
          description: "Idioma de salida. Por defecto 'español'.",
        },
      },
      required: ["content", "type"],
    },
    handler: async (args, userId) => {
      const { content, type, subject, language = "español" } = args;

      if (!content || content.trim().length < 50) {
        return new OperationResult(
          false,
          "El contenido del documento es demasiado corto para generar material de estudio."
        );
      }

      const typePrompts = {
        flashcards:
          "Genera entre 10 y 20 flashcards en formato JSON con estructura: " +
          '[{"front": "pregunta o concepto", "back": "respuesta o definición"}]. ' +
          "Enfócate en los conceptos más importantes.",
        quiz:
          "Genera un quiz de 10 preguntas de opción múltiple en formato JSON: " +
          '[{"question":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A"}]. ' +
          "Varía la dificultad entre fácil, media y difícil.",
        summary:
          "Genera un resumen ejecutivo estructurado con: " +
          "1) Idea principal, 2) Conceptos clave (lista), 3) Conclusiones importantes. " +
          "Máximo 400 palabras.",
        concepts:
          "Genera un mapa de conceptos en formato JSON: " +
          '{"central":"concepto principal","branches":[{"concept":"...","children":["...","..."]}]}. ' +
          "Máximo 3 niveles de profundidad.",
      };

      const typeInstruction = typePrompts[type] || typePrompts.summary;
      const subjectContext = subject ? `Materia: ${subject}. ` : "";

      const systemPrompt =
        `Eres un tutor experto generando material de estudio en ${language}. ` +
        `${subjectContext}${typeInstruction} ` +
        "Responde SOLO con el material solicitado, sin texto adicional.";

      try {
        const response = await createChatCompletion({
          model: MODEL_STUDY,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `DOCUMENTO:\n\n${content}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }, { purpose: "study" });

        const result = response.choices?.[0]?.message?.content?.trim();
        if (!result) {
          return new OperationResult(false, "No se pudo generar el material de estudio.");
        }

        // Try to parse JSON output for structured types
        let parsed = null;
        if (["flashcards", "quiz", "concepts"].includes(type)) {
          try {
            const jsonMatch = result.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          } catch {
            // Return as-is if not valid JSON
          }
        }

        return new OperationResult(
          true,
          parsed ? `Material generado: ${type}` : result,
          { type, subject, material: parsed ?? result }
        );
      } catch (error) {
        console.error("[AI/tools] study_document error", error);
        return new OperationResult(
          false,
          `Error al procesar el documento: ${error.message}`
        );
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TEACHER — Analytics tools (Phase 2)
  // ════════════════════════════════════════════════════════════════════════════

  get_course_analytics: {
    description:
      "Obtiene estadísticas del curso: calificaciones por estudiante, " +
      "promedio general y tasa de entregas. Solo accesible por docentes.",
    parameters: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID del curso a analizar",
        },
      },
      required: ["course_id"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(
        toolRegistry.get_course_analytics.parameters,
        args
      );
      if (!validation.ok) {
        return new OperationResult(false, validation.errors.join("; "));
      }

      try {
        const gradesResult = await courseService.getCourseGrades(
          validation.value.course_id,
          userId
        );
        if (!gradesResult?.data && !Array.isArray(gradesResult)) {
          return new OperationResult(false, "No se pudieron obtener las calificaciones del curso.");
        }

        const grades = gradesResult?.data ?? gradesResult ?? [];
        if (grades.length === 0) {
          return new OperationResult(true, "No hay calificaciones registradas para este curso.", {
            course_id: validation.value.course_id,
            grades: [],
          });
        }

        // Compute summary stats
        const numericGrades = grades
          .map((g) => parseFloat(g.grade ?? g.score ?? 0))
          .filter((n) => !isNaN(n));
        const avg =
          numericGrades.length > 0
            ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(2)
            : "N/A";
        const passing = numericGrades.filter((g) => g >= 3.0).length;

        const summary =
          `📊 Analítica del curso:\n` +
          `• Estudiantes evaluados: ${grades.length}\n` +
          `• Promedio general: ${avg}\n` +
          `• Aprobados (≥3.0): ${passing} de ${numericGrades.length}\n` +
          `• Reprobados: ${numericGrades.length - passing}`;

        return new OperationResult(true, summary, {
          course_id: validation.value.course_id,
          average: parseFloat(avg),
          total: grades.length,
          passing,
          grades,
        });
      } catch (error) {
        return new OperationResult(
          false,
          `Error al obtener analítica: ${error.message}`
        );
      }
    },
  },

  get_at_risk_students: {
    description:
      "Identifica estudiantes en riesgo académico en un curso: " +
      "aquellos con baja tasa de entregas o calificaciones por debajo del umbral.",
    parameters: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID del curso",
        },
        threshold: {
          type: "number",
          description: "Umbral de nota para considerar en riesgo (por defecto 3.0)",
        },
      },
      required: ["course_id"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(
        toolRegistry.get_at_risk_students.parameters,
        args
      );
      if (!validation.ok) {
        return new OperationResult(false, validation.errors.join("; "));
      }

      const threshold = validation.value.threshold ?? 3.0;

      try {
        // Get enrolled students
        const studentsResult = await enrollmentService.getStudents(
          validation.value.course_id,
          userId,
          "teacher"
        );
        const students = Array.isArray(studentsResult)
          ? studentsResult
          : studentsResult?.data ?? [];

        // Get grades to cross-reference
        const gradesResult = await courseService.getCourseGrades(
          validation.value.course_id,
          userId
        );
        const grades = gradesResult?.data ?? gradesResult ?? [];

        // Build a map: userId → average grade
        const gradeMap = {};
        for (const g of grades) {
          const sid = g.student_id ?? g.user_id;
          if (!gradeMap[sid]) gradeMap[sid] = [];
          const val = parseFloat(g.grade ?? g.score ?? 0);
          if (!isNaN(val)) gradeMap[sid].push(val);
        }

        const atRisk = students
          .map((s) => {
            const sid = s.id ?? s.user_id;
            const studentGrades = gradeMap[sid] ?? [];
            const avg =
              studentGrades.length > 0
                ? studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length
                : null;
            return { ...s, average: avg, submissionCount: studentGrades.length };
          })
          .filter(
            (s) =>
              s.average === null || // no submissions at all
              s.average < threshold
          )
          .sort((a, b) => (a.average ?? -1) - (b.average ?? -1));

        if (atRisk.length === 0) {
          return new OperationResult(
            true,
            `✅ No hay estudiantes en riesgo en este curso (umbral: ${threshold}).`,
            { course_id: validation.value.course_id, atRisk: [] }
          );
        }

        const message =
          `⚠️ ${atRisk.length} estudiante(s) en riesgo (umbral: ${threshold}):\n` +
          atRisk
            .map(
              (s) =>
                `• ${s.name ?? s.email} — promedio: ${
                  s.average !== null ? s.average.toFixed(2) : "sin entregas"
                }`
            )
            .join("\n");

        return new OperationResult(true, message, {
          course_id: validation.value.course_id,
          threshold,
          atRisk,
        });
      } catch (error) {
        return new OperationResult(
          false,
          `Error al identificar estudiantes en riesgo: ${error.message}`
        );
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TEACHER — Content generation tools (Phase 2)
  // ════════════════════════════════════════════════════════════════════════════

  generate_course_plan: {
    description:
      "Genera el plan de un curso creando automáticamente eventos en el calendario " +
      "del docente para cada semana del semestre (clases, parciales, entregas).",
    parameters: {
      type: "object",
      properties: {
        course_name: {
          type: "string",
          description: "Nombre de la materia (ej: 'Estructuras de Datos')",
        },
        topics: {
          type: "string",
          description: "Lista de temas separados por comas o saltos de línea",
        },
        start_date: {
          type: "string",
          description: "Fecha de inicio del semestre en formato ISO 8601",
          format: "date-time",
        },
        weeks: {
          type: "number",
          description: "Duración del semestre en semanas (por defecto 16)",
        },
        sessions_per_week: {
          type: "number",
          description: "Sesiones de clase por semana (por defecto 2)",
        },
      },
      required: ["course_name", "topics", "start_date"],
    },
    handler: async (args, userId) => {
      const validation = validateArgs(
        toolRegistry.generate_course_plan.parameters,
        args
      );
      if (!validation.ok) {
        return new OperationResult(false, validation.errors.join("; "));
      }

      const {
        course_name,
        topics,
        start_date,
        weeks = 16,
        sessions_per_week = 2,
      } = validation.value;

      try {
        const startDate = new Date(start_date);
        const topicList = topics
          .split(/[,\n]+/)
          .map((t) => t.trim())
          .filter(Boolean);

        const createdEvents = [];
        const errors = [];
        let weekOffset = 0;

        for (let week = 1; week <= Math.min(weeks, 20); week++) {
          const topic = topicList[(week - 1) % topicList.length];

          for (let session = 1; session <= sessions_per_week; session++) {
            const sessionDate = new Date(startDate);
            sessionDate.setDate(
              startDate.getDate() + weekOffset * 7 + (session - 1) * 2
            );

            const eventResult = await eventsService.save(
              {
                title: `Semana ${week} — ${topic} (${course_name})`,
                description: `Sesión ${session} de ${sessions_per_week}. Tema: ${topic}`,
                start_date: sessionDate.toISOString(),
                end_date: new Date(
                  sessionDate.getTime() + 90 * 60 * 1000
                ).toISOString(), // 1.5h
                type: "academic",
                notify: false,
              },
              { id: userId }
            );

            if (eventResult?.success) {
              createdEvents.push(eventResult.data);
            } else {
              errors.push(`Semana ${week} sesión ${session}`);
            }
          }
          weekOffset++;
        }

        const summary =
          `📅 Plan del semestre generado para "${course_name}":\n` +
          `• ${createdEvents.length} eventos creados en el calendario\n` +
          `• ${weeks} semanas × ${sessions_per_week} sesiones\n` +
          `• ${topicList.length} temas distribuidos` +
          (errors.length > 0 ? `\n⚠️ ${errors.length} eventos con error` : "");

        return new OperationResult(true, summary, {
          course_name,
          eventsCreated: createdEvents.length,
          events: createdEvents,
        });
      } catch (error) {
        return new OperationResult(
          false,
          `Error al generar el plan del curso: ${error.message}`
        );
      }
    },
  },

  generate_question_bank: {
    description:
      "Genera un banco de preguntas para un examen o actividad sobre un tema específico. " +
      "Soporta opción múltiple, verdadero/falso y preguntas abiertas.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Tema sobre el que se generarán las preguntas",
        },
        subject: {
          type: "string",
          description: "Materia (contexto académico)",
        },
        count: {
          type: "number",
          description: "Número de preguntas a generar (por defecto 10, máx 30)",
        },
        type: {
          type: "string",
          description:
            "Tipo: 'multiple_choice' | 'true_false' | 'open' | 'mixed' (por defecto 'mixed')",
        },
        difficulty: {
          type: "string",
          description: "'easy' | 'medium' | 'hard' | 'mixed' (por defecto 'mixed')",
        },
      },
      required: ["topic"],
    },
    handler: async (args) => {
      const {
        topic,
        subject,
        count = 10,
        type = "mixed",
        difficulty = "mixed",
      } = args;

      const clampedCount = Math.min(Math.max(parseInt(count) || 10, 5), 30);
      const subjectCtx = subject ? ` de ${subject}` : "";

      const systemPrompt =
        `Eres un docente universitario experto generando bancos de preguntas${subjectCtx}. ` +
        `Genera exactamente ${clampedCount} preguntas sobre "${topic}" en español. ` +
        `Tipo: ${type}. Dificultad: ${difficulty}. ` +
        `Formato JSON estricto — array de objetos según el tipo:\n` +
        `opción múltiple: {"type":"mc","question":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A","explanation":"..."}\n` +
        `verdadero/falso: {"type":"tf","question":"...","answer":true,"explanation":"..."}\n` +
        `pregunta abierta: {"type":"open","question":"...","rubric":"..."}\n` +
        `Responde SOLO con el array JSON, sin texto adicional.`;

      try {
        const response = await createChatCompletion({
          model: MODEL_STUDY,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Genera el banco de preguntas sobre: ${topic}` },
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }, { purpose: "study" });

        const raw = response.choices?.[0]?.message?.content?.trim();
        if (!raw) {
          return new OperationResult(false, "No se pudo generar el banco de preguntas.");
        }

        let questions = null;
        try {
          const jsonMatch = raw.match(/\[[\s\S]*\]/);
          questions = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          // Return raw text if JSON parse fails
        }

        return new OperationResult(
          true,
          questions
            ? `🎯 Banco de ${questions.length} preguntas generado sobre "${topic}"`
            : raw,
          { topic, subject, type, difficulty, questions: questions ?? raw }
        );
      } catch (error) {
        return new OperationResult(
          false,
          `Error al generar preguntas: ${error.message}`
        );
      }
    },
  },

  generate_rubric: {
    description:
      "Genera una rúbrica de evaluación para una actividad, proyecto o examen.",
    parameters: {
      type: "object",
      properties: {
        activity_name: {
          type: "string",
          description: "Nombre de la actividad o proyecto a evaluar",
        },
        subject: {
          type: "string",
          description: "Materia o curso",
        },
        description: {
          type: "string",
          description: "Descripción breve de lo que se evalúa",
        },
        max_score: {
          type: "number",
          description: "Puntaje máximo de la actividad (por defecto 5.0)",
        },
        criteria_count: {
          type: "number",
          description: "Número de criterios de evaluación (por defecto 4)",
        },
      },
      required: ["activity_name"],
    },
    handler: async (args) => {
      const {
        activity_name,
        subject,
        description,
        max_score = 5.0,
        criteria_count = 4,
      } = args;

      const ctx = subject ? ` de ${subject}` : "";
      const desc = description ? ` Descripción: ${description}.` : "";

      const systemPrompt =
        `Eres un docente universitario experto en evaluación${ctx}. ` +
        `Genera una rúbrica detallada para "${activity_name}".${desc} ` +
        `Puntaje máximo: ${max_score}. Número de criterios: ${criteria_count}. ` +
        `Formato JSON: {"activity":"...","max_score":${max_score},"criteria":[` +
        `{"name":"...","weight":0.25,"levels":[{"level":"Excelente","score":${max_score},"description":"..."},` +
        `{"level":"Bueno","score":${max_score * 0.8},"description":"..."},` +
        `{"level":"Regular","score":${max_score * 0.6},"description":"..."},` +
        `{"level":"Insuficiente","score":${max_score * 0.3},"description":"..."}]}]}. ` +
        `Responde SOLO con el JSON.`;

      try {
        const response = await createChatCompletion({
          model: MODEL_STUDY,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Genera la rúbrica para: ${activity_name}` },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }, { purpose: "study" });

        const raw = response.choices?.[0]?.message?.content?.trim();
        if (!raw) {
          return new OperationResult(false, "No se pudo generar la rúbrica.");
        }

        let rubric = null;
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          rubric = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          // Return raw if JSON fails
        }

        return new OperationResult(
          true,
          rubric
            ? `📋 Rúbrica generada para "${activity_name}" con ${rubric.criteria?.length ?? criteria_count} criterios`
            : raw,
          { activity_name, subject, rubric: rubric ?? raw }
        );
      } catch (error) {
        return new OperationResult(
          false,
          `Error al generar la rúbrica: ${error.message}`
        );
      }
    },
  },
};

export const toolDefinitions = Object.entries(toolRegistry).map(([name, tool]) => ({
  type: "function",
  function: {
    name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

export const executeTool = async ({ name, args, userId }) => {
  const tool = toolRegistry[name];
  if (!tool) {
    return new OperationResult(false, `Herramienta desconocida: ${name}`);
  }
  if (!userId) {
    return new OperationResult(false, "Usuario requerido para ejecutar herramientas");
  }

  try {
    return await tool.handler(args, userId);
  } catch (error) {
    console.error(`[AI/tools] Error ejecutando ${name}`, error);
    return new OperationResult(false, `No pude completar "${name}": ${error.message}`);
  }
};
