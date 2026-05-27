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
      const data = await this.service.submitAssignment(req.body, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getByAssignment(req, res) {
    try {
      const role = req.user.role || 'student';
      const data = await this.service.getSubmissions(req.params.id, req.user.id, role);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async grade(req, res) {
    try {
      const { grade, feedback } = req.body;
      const data = await this.service.gradeSubmission(req.params.id, grade, feedback, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getPendingReviews(req, res) {
    try {
      const data = await this.service.getPendingReviews(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
