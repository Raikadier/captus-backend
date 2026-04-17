import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import crypto from 'crypto';

export default class CourseService {
  constructor(courseRepo, enrollmentRepo) {
    this.courseRepo = courseRepo || new CourseRepository();
    this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
  }

  async createCourse(data, teacherId) {
    // Generate unique invite code
    let inviteCode;
    let isUnique = false;

    while (!isUnique) {
      inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
      const existing = await this.courseRepo.findByInviteCode(inviteCode);
      if (!existing) isUnique = true;
    }

    const courseData = {
      ...data,
      teacher_id: teacherId,
      invite_code: inviteCode
    };

    return await this.courseRepo.save(courseData);
  }

  async getCoursesForUser(userId, role) {
    if (role === 'teacher') {
      const courses = await this.courseRepo.findByTeacher(userId);
      // Transform data for teacher view (add counts)
      return courses.map(course => ({
        ...course,
        students: course.enrollments?.[0]?.count || 0,
        pendingTasks: 0 // Placeholder as per original logic
      }));
    } else {
      const enrollments = await this.courseRepo.findByStudent(userId);
      // Transform data for student view
      return enrollments.map(item => ({
        ...item.courses,
        professor: item.courses?.teacher?.name || 'Profesor',
        progress: 0,
        enrolled_at: item.enrolled_at
      }));
    }
  }

  async getCourseDetail(courseId, userId, role) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');

    // Access Control
    if (role === 'teacher') {
      if (course.teacher_id !== userId) throw new Error('No tienes permiso para ver este curso');
    } else {
      const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
      if (!isEnrolled) throw new Error('No estás inscrito en este curso');
    }

    return course;
  }

  async updateCourse(courseId, data, teacherId) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para editar este curso');

    return await this.courseRepo.update(courseId, data);
  }

  async deleteCourse(courseId, teacherId) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para eliminar este curso');

    return await this.courseRepo.delete(courseId);
  }

  async getCourseGrades(courseId, teacherId) {
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para descargar las notas de este curso');

    // Get enrollments with student details
    const enrollments = await this.enrollmentRepo.getCourseStudents(courseId);

    // Map to a simpler structure
    return enrollments.map(e => ({
      studentName: e.name || 'Estudiante',
      studentEmail: e.email || 'N/A',
      grade: e.grade || 0, // Ensure repository returns grade
      enrolledAt: e.enrolled_at
    }));
  }
}
