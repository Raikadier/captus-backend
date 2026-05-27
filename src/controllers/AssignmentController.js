import AssignmentService from '../services/AssignmentService.js';
import AssignmentRepository from '../repositories/AssignmentRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import CourseRepository from '../repositories/CourseRepository.js';

export class AssignmentController {
  constructor() {
    const assignmentRepo = new AssignmentRepository();
    const enrollmentRepo = new EnrollmentRepository();
    const courseRepo = new CourseRepository();
    this.service = new AssignmentService(assignmentRepo, enrollmentRepo, courseRepo);
  }

  async create(req, res) {
    try {
      const data = await this.service.createAssignment(req.body, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getByCourse(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getAssignmentsByCourse(req.params.id, req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getAssignmentById(req.params.id, req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await this.service.updateAssignment(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await this.service.deleteAssignment(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Tarea eliminada' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
