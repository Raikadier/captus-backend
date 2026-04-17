import EnrollmentService from '../services/EnrollmentService.js';

export class EnrollmentController {
  constructor() {
    this.service = new EnrollmentService();
  }

  async addStudent(req, res) {
    try {
      const { courseId, email } = req.body;
      const teacherId = req.user.id;
      const result = await this.service.addStudentManually(courseId, email, teacherId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async joinByCode(req, res) {
    try {
      const { code } = req.body;
      const studentId = req.user.id;
      const result = await this.service.joinByCode(code, studentId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getStudents(req, res) {
    try {
      const { id } = req.params; // Course ID
      const userId = req.user.id;
      const role = req.user.role || 'student';
      const result = await this.service.getStudents(id, userId, role);
      res.json(result);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }
}
