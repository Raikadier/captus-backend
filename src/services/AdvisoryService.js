import { TaskService } from "./TaskService.js";
import CourseService from "./CourseService.js";
import AssignmentService from "./AssignmentService.js";
import SubmissionService from "./SubmissionService.js";
import { OperationResult } from "../shared/OperationResult.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Score pending work items for advisory prioritization.
 * Higher score = more urgent/important to tackle next.
 * Overdue items are excluded before scoring.
 */
export const scoreWorkItem = (item, now = new Date()) => {
  const due = item.due_date ? new Date(item.due_date) : null;
  if (!due || due < now) return null;

  const daysUntil = Math.max(0, (due - now) / MS_PER_DAY);
  const urgency = 1 / (daysUntil + 1);
  const priority = (item.priority_id ?? item.priority ?? 2) / 3;
  const complexity = (item.complexity ?? 3) / 5;
  const hours = Number(item.estimated_hours ?? 1);
  const timePressure = hours / (daysUntil * 8 + 1);

  const score =
    urgency * 0.4 +
    priority * 0.25 +
    complexity * 0.15 +
    timePressure * 0.2;

  return {
    ...item,
    score: Math.round(score * 1000) / 1000,
    days_until_due: Math.round(daysUntil * 10) / 10,
  };
};

export default class AdvisoryService {
  constructor(taskService, courseService, assignmentService, submissionService) {
    this.taskService = taskService || new TaskService();
    this.courseService = courseService || new CourseService();
    this.assignmentService = assignmentService || new AssignmentService();
    this.submissionService = submissionService || new SubmissionService();
  }

  async _hasSubmitted(assignment, userId) {
    try {
      const submission = await this.submissionService.getSubmissions(
        assignment.id,
        userId,
        "student"
      );
      return Boolean(submission);
    } catch {
      return false;
    }
  }

  async prioritizeWorkload(userId, options = {}) {
    try {
      const limit = options.limit ?? 10;
      const now = new Date();
      const items = [];

      const tasksResult = await this.taskService.getTasksForAi(
        { includeCompleted: false, excludeOverdue: true, limit: 50 },
        { id: userId }
      );

      if (tasksResult.success && tasksResult.data?.length) {
        for (const task of tasksResult.data) {
          const scored = scoreWorkItem(
            {
              type: "personal_task",
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              priority_id: task.priority_id,
              complexity: task.complexity,
              estimated_hours: task.estimated_hours,
            },
            now
          );
          if (scored) items.push(scored);
        }
      }

      const courses = await this.courseService.getCoursesForUser(userId, "student");
      const courseList = Array.isArray(courses) ? courses : courses?.data ?? [];

      for (const course of courseList) {
        try {
          const assignments = await this.assignmentService.getAssignmentsByCourse(
            course.id,
            userId,
            "student"
          );
          const list = Array.isArray(assignments) ? assignments : assignments?.data ?? [];

          for (const assignment of list) {
            if (assignment.due_date && new Date(assignment.due_date) < now) continue;

            const submitted = await this._hasSubmitted(assignment, userId);
            if (submitted) continue;

            const scored = scoreWorkItem(
              {
                type: "course_assignment",
                id: assignment.id,
                title: assignment.title,
                description: assignment.description,
                due_date: assignment.due_date,
                priority_id: assignment.priority_id ?? 2,
                complexity: assignment.complexity,
                estimated_hours: assignment.estimated_hours,
                course_id: course.id,
                course_name: course.name || course.title,
                is_group_assignment: assignment.is_group_assignment,
              },
              now
            );
            if (scored) items.push(scored);
          }
        } catch {
          /* skip inaccessible course */
        }
      }

      items.sort((a, b) => b.score - a.score);
      const ranked = items.slice(0, limit);

      const message = ranked.length
        ? ranked
            .map(
              (item, i) =>
                `${i + 1}. [${item.type === "personal_task" ? "Tarea" : "Entrega"}] ${item.title}` +
                (item.course_name ? ` (${item.course_name})` : "") +
                ` | Vence: ${new Date(item.due_date).toLocaleDateString("es-ES")}` +
                ` | Prioridad score: ${item.score}` +
                ` | Complejidad: ${item.complexity ?? 3}/5` +
                ` | Tiempo est.: ${item.estimated_hours ?? "?"}h`
            )
            .join("\n")
        : "No hay tareas ni entregas pendientes (sin vencidas).";

      return new OperationResult(true, message, { items: ranked, total: items.length });
    } catch (error) {
      return new OperationResult(false, `Error al priorizar carga de trabajo: ${error.message}`);
    }
  }
}
