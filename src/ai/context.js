import { TaskService } from "../services/TaskService.js";
import { NotesService } from "../services/NotesService.js";
import { EventsService } from "../services/EventsService.js";
import EventsRepository from "../repositories/EventsRepository.js";
import CourseService from "../services/CourseService.js";

const taskService = new TaskService();
const notesService = new NotesService();
// FIX: EventsService requires repository injection
const eventsService = new EventsService(new EventsRepository());
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

      case "courses": {
        const courses = await courseService.getCoursesForUser(userId, userRole);
        const list = Array.isArray(courses) ? courses : courses?.data ?? [];
        if (!list.length) return "El estudiante no tiene cursos activos.";
        return (
          "CURSOS DEL ESTUDIANTE:\n" +
          list
            .map((c) =>
              `- [${c.id}] ${c.name || c.title} | Código: ${c.code || c.invite_code || "N/A"} | Docente: ${c.professor || c.teacherName || "N/A"} | Progreso: ${Math.round((c.progress || 0) * 100)}%`
            )
            .join("\n")
        );
      }

      case "assignments": {
        // Get student courses first, then pending assignments
        const courses = await courseService.getCoursesForUser(userId, userRole);
        const courseList = Array.isArray(courses) ? courses : courses?.data ?? [];
        if (!courseList.length) return "No tienes cursos activos, no hay asignaciones.";

        const AssignmentService = (await import("../services/AssignmentService.js")).default;
        const assignmentService = new AssignmentService();

        const allAssignments = [];
        for (const course of courseList.slice(0, 5)) {
          try {
            const result = await assignmentService.getAssignmentsByCourse(course.id, userId, userRole);
            const list = Array.isArray(result) ? result : result?.data ?? [];
            allAssignments.push(...list.map(a => ({ ...a, courseName: course.name || course.title })));
          } catch { /* skip */ }
        }

        if (!allAssignments.length) return "No tienes asignaciones pendientes.";

        return (
          "ASIGNACIONES/ENTREGAS:\n" +
          allAssignments.slice(0, 10).map(a =>
            `- [${a.id}] ${a.title} | Curso: ${a.courseName} | Vence: ${a.due_date ? new Date(a.due_date).toLocaleDateString("es-ES") : "sin fecha"}`
          ).join("\n")
        );
      }

      case "stats": {
        const { StatisticsService } = await import("../services/StatisticsService.js");
        const statsService = new StatisticsService();
        try {
          const result = await statsService.getByCurrentUser(userId);
          const stats = result?.data || result;
          if (!stats) return "No hay estadísticas disponibles aún.";
          return (
            "ESTADÍSTICAS DEL ESTUDIANTE:\n" +
            `- Racha actual: ${stats.current_streak || 0} días\n` +
            `- Racha máxima: ${stats.max_streak || 0} días\n` +
            `- Tareas completadas: ${stats.tasks_completed || 0}\n` +
            `- Tareas creadas: ${stats.tasks_created || 0}\n` +
            `- Tasa de éxito: ${stats.success_rate ? Math.round(stats.success_rate * 100) + "%" : "N/A"}\n` +
            `- Días productivos esta semana: ${stats.weekly_completions?.filter(n => n > 0).length || 0}/7`
          );
        } catch {
          return "No se pudieron cargar las estadísticas.";
        }
      }

      case "notifications":
        // Tools not yet implemented; falls back to general conversation.
        return null;

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
