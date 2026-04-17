import { TaskService } from "../services/TaskService.js";
import { NotesService } from "../services/NotesService.js";
import { EventsService } from "../services/EventsService.js";

const taskService = new TaskService();
const notesService = new NotesService();
const eventsService = new EventsService();

export const fetchContextForIntent = async (intent, userId) => {
    if (!userId) return null;

    try {
        switch (intent) {
            case "tasks": {
                const tasks = await taskService.getTasksForAi({ includeCompleted: false, limit: 10 }, { id: userId });
                if (!tasks.success) return "Error cargando tareas.";
                if (!tasks.data || tasks.data.length === 0) return "El usuario no tiene tareas pendientes.";
                return tasks.data.map(t =>
                    `- [${t.id}] ${t.title} (${t.due_date ? new Date(t.due_date).toLocaleDateString() : "sin fecha"})`
                ).join("\n");
            }

            case "notes": {
                const notes = await notesService.getAll({ id: userId });
                if (!notes.success) return "Error cargando notas.";
                if (!notes.data || notes.data.length === 0) return "El usuario no tiene notas.";
                return notes.data.slice(0, 5).map(n =>
                    `- [${n.id}] ${n.title} ${n.is_pinned ? "(Fijada)" : ""}`
                ).join("\n");
            }

            case "events": {
                const events = await eventsService.getUpcoming({ limit: 5 }, { id: userId });
                if (!events.success) return "Error cargando eventos.";
                if (!events.data || events.data.length === 0) return "No hay eventos próximos.";
                return events.data.map(e =>
                    `- [${e.id}] ${e.title} (${new Date(e.start_date).toLocaleString()})`
                ).join("\n");
            }

            default:
                return null;
        }
    } catch (error) {
        console.error(`[AI/Context] Error fetching context for ${intent}`, error);
        return null;
    }
};
