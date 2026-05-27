import EnrollmentService from '../services/EnrollmentService.js';

export class EnrollmentController {
  constructor() {
    this.service = new EnrollmentService();
  }

  async addStudent(req, res) {
    try {
      const { courseId, email } = req.body;
      const data = await this.service.addStudentManually(courseId, email, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async joinByCode(req, res) {
    try {
      const { code } = req.body;
      const data = await this.service.joinByCode(code, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getStudents(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getStudents(req.params.id, req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }
}
