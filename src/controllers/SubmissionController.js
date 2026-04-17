import SubmissionService from '../services/SubmissionService.js';
import SubmissionRepository from '../repositories/SubmissionRepository.js';
import AssignmentRepository from '../repositories/AssignmentRepository.js';
import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import AcademicGroupRepository from '../repositories/AcademicGroupRepository.js';

export class SubmissionController {
  constructor() {
    const submissionRepo = new SubmissionRepository();
    const assignmentRepo = new AssignmentRepository();
    const courseRepo = new CourseRepository();
    const enrollmentRepo = new EnrollmentRepository();
    const groupRepo = new AcademicGroupRepository();

    this.service = new SubmissionService(
      submissionRepo,
      assignmentRepo,
      courseRepo,
      enrollmentRepo,
      groupRepo
    );
  }

  async submit(req, res) {
    try {
      const studentId = req.user.id;
      // req.body: { assignment_id, file_url, group_id (opt) }
      const result = await this.service.submitAssignment(req.body, studentId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getByAssignment(req, res) {
    try {
      const { id } = req.params; // assignmentId
      const userId = req.user.id;
      const role = req.user.role || 'student';
      const result = await this.service.getSubmissions(id, userId, role);
      res.json(result);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }

  async grade(req, res) {
    try {
      const { id } = req.params; // submissionId
      const { grade, feedback } = req.body;
      const teacherId = req.user.id;
      const result = await this.service.gradeSubmission(id, grade, feedback, teacherId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getPendingReviews(req, res) {
    try {
      const teacherId = req.user.id;
      const result = await this.service.getPendingReviews(teacherId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
