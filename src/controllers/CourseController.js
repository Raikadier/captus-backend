import CourseService from '../services/CourseService.js';
import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';

export class CourseController {
  constructor() {
    const courseRepo = new CourseRepository();
    const enrollmentRepo = new EnrollmentRepository();
    this.service = new CourseService(courseRepo, enrollmentRepo);
  }

  async create(req, res) {
    try {
      const { title, description, subject_id } = req.body;
      const data = await this.service.createCourse({ title, description, subject_id }, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getCoursesForUser(req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTeacherCourses(req, res) {
    try {
      const data = await this.service.getCoursesForUser(req.user.id, 'teacher');
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStudentCourses(req, res) {
    try {
      const data = await this.service.getCoursesForUser(req.user.id, 'student');
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getCourseDetail(req.params.id, req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await this.service.updateCourse(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await this.service.deleteCourse(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Curso eliminado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async downloadGrades(req, res) {
    try {
      const grades = await this.service.getCourseGrades(req.params.id, req.user.id);

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
    } catch (error) {
      console.error('Error downloading grades:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
