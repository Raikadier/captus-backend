import CourseMaterialRepository from "../repositories/CourseMaterialRepository.js";
import CourseRepository from "../repositories/CourseRepository.js";
import EnrollmentRepository from "../repositories/EnrollmentRepository.js";
import CourseService from "./CourseService.js";
import { OperationResult } from "../shared/OperationResult.js";

export default class CourseMaterialService {
  constructor(materialRepo, courseRepo, enrollmentRepo, courseService) {
    this.repo = materialRepo || new CourseMaterialRepository();
    this.courseRepo = courseRepo || new CourseRepository();
    this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
    this.courseService = courseService || new CourseService();
  }

  async _assertCourseAccess(courseId, userId, role) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error("Curso no encontrado");

    if (role === "teacher") {
      if (course.teacher_id !== userId) throw new Error("No autorizado");
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
      if (!isEnrolled) throw new Error("No estás inscrito en este curso");
    }
    return course;
  }

  async getMaterialsByCourse(courseId, userId, role = "student") {
    try {
      const course = await this._assertCourseAccess(courseId, userId, role);
      const materials = await this.repo.findByCourse(courseId);
      return new OperationResult(true, "Materiales obtenidos.", { course, materials });
    } catch (error) {
      return new OperationResult(false, error.message);
    }
  }

  async searchCourseContent(courseId, query, userId, role = "student", limit = 5) {
    try {
      const course = await this._assertCourseAccess(courseId, userId, role);
      const materials = await this.repo.searchByCourse(courseId, query, limit);
      return new OperationResult(true, "Búsqueda completada.", { course, query, materials });
    } catch (error) {
      return new OperationResult(false, error.message);
    }
  }

  async searchAcrossEnrolledCourses(query, userId, limit = 8) {
    try {
      const courses = await this.courseService.getCoursesForUser(userId, "student");
      const courseList = Array.isArray(courses) ? courses : courses?.data ?? [];
      const courseIds = courseList.map((c) => c.id).filter(Boolean);
      if (!courseIds.length) {
        return new OperationResult(true, "No tienes cursos inscritos.", { materials: [] });
      }
      const materials = await this.repo.searchInCourses(courseIds, query, limit);
      return new OperationResult(true, "Búsqueda completada.", { query, materials });
    } catch (error) {
      return new OperationResult(false, error.message);
    }
  }

  async createMaterial(data, userId, role = "teacher") {
    try {
      const { course_id, title, content, file_path } = data;
      await this._assertCourseAccess(course_id, userId, role);

      const saved = await this.repo.save({
        courseId: course_id,
        title,
        content: content ?? null,
        filePath: file_path ?? null,
        uploadedBy: userId,
      });

      return saved
        ? new OperationResult(true, "Material creado.", saved)
        : new OperationResult(false, "Error al crear material.");
    } catch (error) {
      return new OperationResult(false, error.message);
    }
  }
}
