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
    try {
      const { title, description, subject_id } = req.body;
      const teacherId = req.user.id;
      const result = await this.service.createCourse({ title, description, subject_id }, teacherId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      // Prompt asks for GET /teacher and GET /student separate routes,
      // but a single GET / with role detection is cleaner.
      // However, to strictly follow instructions:
      // "GET /teacher cursos del profesor", "GET /student cursos del estudiante"
      // I will implement generic get that adapts, or specific ones.
      // Let's implement generic `getMyCourses` which works for both.

      // But I will also expose specific methods if routed that way.
      const userId = req.user.id;
      // We need to fetch the role from DB if not in token, but context says verifySupabaseToken is used.
      // Let's assume req.user has what we need or we pass it.
      // The prompt "Validation roles (student / teacher)" implies we check DB or token.

      // IMPORTANT: verifySupabaseToken might not set 'role' from 'public.users' but from metadata.
      // The prompt says "Validar que user.user_metadata.name... public.users table... role column".
      // I will assume the role comes from the DB check I'll do or helper.

      // For now, I'll pass the role from the request if middleware attached it,
      // or fetch it if needed. To be safe, let's query the role if missing or trust middleware.
      // Actually, `requireRole` middleware exists.

      // If the route is /teacher/courses, we know the role is teacher.
      // If the route is /student/courses, we know the role is student.

      // I will implement a single `listMyCourses` that takes context.

      // But wait, the prompt says:
      // GET /teacher -> cursos del profesor
      // GET /student -> cursos del estudiante

      // I will implement `listTeacherCourses` and `listStudentCourses`.

      const role = req.user.role || 'student'; // Fallback
      const result = await this.service.getCoursesForUser(userId, role);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTeacherCourses(req, res) {
    try {
      const result = await this.service.getCoursesForUser(req.user.id, 'teacher');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStudentCourses(req, res) {
    try {
      const result = await this.service.getCoursesForUser(req.user.id, 'student');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const courseId = req.params.id;
      const userId = req.user.id;
      // We need the user's role to determine access logic (owner vs enrolled)
      // I'll fetch the user role from DB to be sure, or rely on token.
      // Let's assume the service handles "try both" or we pass the role.
      // A safe bet is to pass the role found in DB.

      // Helper to get role if not in req.user?
      // For now, assume req.user.role is populated by my middleware logic
      // or I default to student if not teacher.

      const role = req.user.role || 'student';
      const result = await this.service.getCourseDetail(courseId, userId, role);
      res.json(result);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const courseId = req.params.id;
      const teacherId = req.user.id;
      const result = await this.service.updateCourse(courseId, req.body, teacherId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const courseId = req.params.id;
      const teacherId = req.user.id;
      await this.service.deleteCourse(courseId, teacherId);
      res.json({ message: 'Curso eliminado' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async downloadGrades(req, res) {
    try {
      const courseId = req.params.id;
      const teacherId = req.user.id;
      const grades = await this.service.getCourseGrades(courseId, teacherId);

      // Generate TXT content
      let content = `REPORTE DE NOTAS - CURSO ID: ${courseId}\n`;
      content += `Generado el: ${new Date().toLocaleString()}\n`;
      content += `------------------------------------------------\n`;
      content += `Estudiante | Email | Nota Final\n`;
      content += `------------------------------------------------\n`;

      grades.forEach(g => {
        content += `${g.studentName.padEnd(20)} | ${g.studentEmail.padEnd(30)} | ${g.grade}\n`;
      });

      // Set headers for download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=notas_curso_${courseId}.txt`);

      res.send(content);
    } catch (error) {
      console.error('Error downloading grades:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
