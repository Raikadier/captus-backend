import { TaskService } from "../services/TaskService.js";
import { NotesService } from "../services/NotesService.js";
import { EventsService } from "../services/EventsService.js";
import { OperationResult } from "../shared/OperationResult.js";

const taskService = new TaskService();
const notesService = new NotesService();
const eventsService = new EventsService();

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
    throw error;
  }
};
