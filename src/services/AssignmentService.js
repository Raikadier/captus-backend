import AssignmentRepository from '../repositories/AssignmentRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import CourseRepository from '../repositories/CourseRepository.js';
import NotificationService from './NotificationService.js';

export default class AssignmentService {
  constructor(assignmentRepo, enrollmentRepo, courseRepo) {
    this.repo = assignmentRepo || new AssignmentRepository();
    this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
    this.courseRepo = courseRepo || new CourseRepository();
  }

  async createAssignment(data, teacherId) {
    const { course_id, title } = data;

    // Verify ownership
    const course = await this.courseRepo.getById(course_id);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No autorizado');

    const assignment = await this.repo.save(data);

    // Notify students
    await this._notifyCourseStudents(course_id, `Nueva tarea: ${title}`, `El profesor ha creado una nueva tarea en ${course.title}`, assignment.id);

    return assignment;
  }

  async getAssignmentsByCourse(courseId, userId, role) {
    // Access check
    if (role === 'teacher') {
      const course = await this.courseRepo.getById(courseId);
      if (course.teacher_id !== userId) throw new Error('No autorizado');
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
      if (!isEnrolled) throw new Error('No estás inscrito en este curso');
    }

    return await this.repo.findByCourse(courseId);
  }

  async getAssignmentById(id, userId, role) {
    const assignment = await this.repo.getById(id);
    if (!assignment) throw new Error('Tarea no encontrada');

    if (role === 'teacher') {
      const course = await this.courseRepo.getById(assignment.course_id);
      if (course.teacher_id !== userId) throw new Error('No autorizado');
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(assignment.course_id, userId);
      if (!isEnrolled) throw new Error('No autorizado');
    }

    return assignment;
  }

  async updateAssignment(id, data, teacherId) {
    const assignment = await this.repo.getById(id);
    const course = await this.courseRepo.getById(assignment.course_id);

    if (course.teacher_id !== teacherId) throw new Error('No autorizado');

    const updated = await this.repo.update(id, data);

    // Notify students of update
    await this._notifyCourseStudents(assignment.course_id, 'Tarea Actualizada', `La tarea "${updated.title}" ha sido modificada.`, updated.id, 'assignment_updated');

    return updated;
  }

  async deleteAssignment(id, teacherId) {
    const assignment = await this.repo.getById(id);
    const course = await this.courseRepo.getById(assignment.course_id);

    if (course.teacher_id !== teacherId) throw new Error('No autorizado');

    return await this.repo.delete(id);
  }

  async _notifyCourseStudents(courseId, title, body, entityId, eventType = 'assignment_created') {
    const students = await this.enrollmentRepo.getCourseStudents(courseId);

    if (students.length === 0) return;

    for (const s of students) {
      await NotificationService.notify({
        user_id: s.id,
        title,
        body,
        event_type: eventType,
        entity_id: entityId,
        metadata: { course_id: courseId }
      });
    }
  }
}
