import AcademicGroupRepository from '../repositories/AcademicGroupRepository.js';
import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';

export default class AcademicGroupService {
  constructor() {
    this.repo = new AcademicGroupRepository();
    this.courseRepo = new CourseRepository();
    this.enrollmentRepo = new EnrollmentRepository();
  }

  async createGroup(data, userId, role) {
    const { course_id, name, description } = data;

    // Check permissions
    if (role === 'teacher') {
      const course = await this.courseRepo.getById(course_id);
      if (course.teacher_id !== userId) throw new Error('No autorizado');
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(course_id, userId);
      if (!isEnrolled && role !== 'teacher') throw new Error('No autorizado');
    }

    // 1. Create Group
    const group = await this.repo.save({
      course_id,
      name,
      description,
      created_by: userId
    });

    // 2. Add Creator as Member (if they are a student)
    // Teachers usually don't join groups as members, they supervise.
    // Logic: If creator is 'student' role (passed in arg) or simply if they are enrolled?
    // Let's assume if it's a student creating it, they join it.
    // If teacher creates it, they don't join.

    // We can rely on the passed `role` or check enrollment.
    // Safer: Check if `userId` is enrolled as student.
    const isEnrolled = await this.enrollmentRepo.isEnrolled(course_id, userId);

    if (isEnrolled) {
      await this.repo.addMember(group.id, userId);
    }

    return group;
  }

  async addMember(groupId, studentId, requesterId, role) {
    // Validate group exists
    const group = await this.repo.getById(groupId);
    if (!group) throw new Error('Grupo no encontrado');

    const course = await this.courseRepo.getById(group.course_id);

    // Permission check
    if (role === 'teacher') {
      if (course.teacher_id !== requesterId) throw new Error('No autorizado');
    } else {
      // Strict: Group creator.
      if (group.created_by !== requesterId) throw new Error('Solo el creador del grupo puede agregar miembros');
    }

    // Validate student is in the course
    const isEnrolled = await this.enrollmentRepo.isEnrolled(group.course_id, studentId);
    if (!isEnrolled) throw new Error('El estudiante no está inscrito en el curso');

    return await this.repo.addMember(groupId, studentId);
  }

  async getGroupsByCourse(courseId, userId, role) {
    if (role === 'teacher') {
      const course = await this.courseRepo.getById(courseId);
      if (course.teacher_id !== userId) throw new Error('No autorizado');
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
      if (!isEnrolled) throw new Error('No autorizado');
    }
    return await this.repo.findByCourse(courseId);
  }

  async getMyGroups(userId) {
    return await this.repo.findByStudent(userId);
  }
}
