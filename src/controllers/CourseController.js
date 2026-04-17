import CourseService from '../services/CourseService.js';
import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';

export class CourseController {
  constructor() {
    // Manual Dependency Injection
    const courseRepo = new CourseRepository();
    const enrollmentRepo = new EnrollmentRepository();
    this.service = new CourseService(courseRepo, enrollmentRepo);
  }

  // Middleware to inject user is already used in routes (verifySupabaseToken)
  // req.user contains { id, email, role } (if role is synced) or we fetch it.
  // The middleware `verifySupabaseToken` usually attaches `req.user`.

  async create(req, res) {
    const { title, description, subject_id } = req.body;
    const result = await this.service.createCourse({ title, description, subject_id }, req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }

  async getAll(req, res) {
    const role = req.user.role || 'student';
    const result = await this.service.getCoursesForUser(req.user.id, role);
    res.status(result.success ? 200 : 500).json(result);
  }

  async getTeacherCourses(req, res) {
    const result = await this.service.getCoursesForUser(req.user.id, 'teacher');
    res.status(result.success ? 200 : 500).json(result);
  }

  async getStudentCourses(req, res) {
    const result = await this.service.getCoursesForUser(req.user.id, 'student');
    res.status(result.success ? 200 : 500).json(result);
  }

  async getById(req, res) {
    const role = req.user.role || 'student';
    const result = await this.service.getCourseDetail(req.params.id, req.user.id, role);
    res.status(result.success ? 200 : 403).json(result);
  }

  async update(req, res) {
    const result = await this.service.updateCourse(req.params.id, req.body, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const result = await this.service.deleteCourse(req.params.id, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async downloadGrades(req, res) {
    const result = await this.service.getCourseGrades(req.params.id, req.user.id);
    if (!result.success) {
      return res.status(403).json(result);
    }

    const grades = result.data;
    let content = `REPORTE DE NOTAS - CURSO ID: ${req.params.id}\n`;
    content += `Generado el: ${new Date().toLocaleString()}\n`;
    content += `------------------------------------------------\n`;
    content += `Estudiante | Email | Nota Final\n`;
    content += `------------------------------------------------\n`;
    grades.forEach(g => {
      content += `${g.studentName.padEnd(20)} | ${g.studentEmail.padEnd(30)} | ${g.grade}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=notas_curso_${req.params.id}.txt`);
    res.send(content);
  }
}
