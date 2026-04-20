import { TaskService } from "../services/TaskService.js";
import { NotesService } from "../services/NotesService.js";
import { EventsService } from "../services/EventsService.js";
import CourseService from "../services/CourseService.js";

const taskService = new TaskService();
const notesService = new NotesService();
const eventsService = new EventsService();
const courseService = new CourseService();

/**
 * Pre-fetches lightweight context for a given intent so the orchestrator
 * can answer simple queries without calling a tool (RAG-lite pattern).
 *
 * @param {string} intent
 * @param {string} userId
 * @param {"student"|"teacher"} userRole
 */
export const fetchContextForIntent = async (intent, userId, userRole = "student") => {
  if (!userId) return null;

  try {
    switch (intent) {
      case "tasks": {
        const tasks = await taskService.getTasksForAi(
          { includeCompleted: false, limit: 10 },
          { id: userId }
        );
        if (!tasks.success) return "Error cargando tareas.";
        if (!tasks.data?.length) return "El usuario no tiene tareas pendientes.";
        return tasks.data
          .map(
            (t) =>
              `- [${t.id}] ${t.title} (${
                t.due_date
                  ? new Date(t.due_date).toLocaleDateString("es-ES")
                  : "sin fecha"
              })${t.completed ? " ✅" : ""}`
          )
          .join("\n");
      }

      case "notes": {
        const notes = await notesService.getAll({ id: userId });
        if (!notes.success) return "Error cargando notas.";
        if (!notes.data?.length) return "El usuario no tiene notas.";
        return notes.data
          .slice(0, 5)
          .map((n) => `- [${n.id}] ${n.title}${n.is_pinned ? " 📌" : ""}`)
          .join("\n");
      }

      case "events": {
        const events = await eventsService.getUpcoming(
          { limit: 5 },
          { id: userId }
        );
        if (!events.success) return "Error cargando eventos.";
        if (!events.data?.length) return "No hay eventos próximos.";
        return events.data
          .map(
            (e) =>
              `- [${e.id}] ${e.title} (${new Date(e.start_date).toLocaleString("es-ES")})`
          )
          .join("\n");
      }

      case "teacher_analytics":
      case "teacher_content": {
        if (userRole !== "teacher") return null;
        // Pre-load the teacher's courses so the LLM knows which IDs to use.
        const courses = await courseService.getCoursesForUser(userId, "teacher");
        const list = Array.isArray(courses)
          ? courses
          : courses?.data ?? [];
        if (!list.length) return "El docente no tiene cursos activos.";
        return (
          "CURSOS DEL DOCENTE:\n" +
          list
            .map((c) => `- [${c.id}] ${c.title} (código: ${c.invite_code ?? "N/A"})`)
            .join("\n")
        );
      }

      case "study":
      default:
        // For study intent, the document content is sent inline — no pre-fetch.
        return null;
    }
  } catch (error) {
    console.error(`[AI/Context] Error fetching context for ${intent}`, error);
    return null;
  }
};
