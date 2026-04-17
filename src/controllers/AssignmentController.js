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
      // req.body should contain { course_id, title, description, due_date, is_group_assignment }
      const teacherId = req.user.id;
      const result = await this.service.createAssignment(req.body, teacherId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getByCourse(req, res) {
    try {
      const { id } = req.params; // courseId
      const userId = req.user.id;
      const role = req.user.role || 'student';
      const result = await this.service.getAssignmentsByCourse(id, userId, role);
      res.json(result);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const role = req.user.role || 'student';
      const result = await this.service.getAssignmentById(id, userId, role);
      res.json(result);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;
      const result = await this.service.updateAssignment(id, req.body, teacherId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const teacherId = req.user.id;
      await this.service.deleteAssignment(id, teacherId);
      res.json({ message: 'Tarea eliminada' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
