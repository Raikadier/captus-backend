import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';

export default class EnrollmentService {
  constructor() {
    this.courseRepo = new CourseRepository();
    this.enrollmentRepo = new EnrollmentRepository();
  }

  async joinByCode(inviteCode, studentId) {
    const course = await this.courseRepo.findByInviteCode(inviteCode);
    if (!course) throw new Error('Código de invitación inválido');

    const isEnrolled = await this.enrollmentRepo.isEnrolled(course.id, studentId);
    if (isEnrolled) throw new Error('Ya estás inscrito en este curso');

    return await this.enrollmentRepo.save({
      course_id: course.id,
      student_id: studentId
    });
  }

  async addStudentManually(courseId, studentEmail, teacherId) {
    // Verify teacher ownership
    const course = await this.courseRepo.getById(courseId);
    if (!course) throw new Error('Curso no encontrado');
    if (course.teacher_id !== teacherId) throw new Error('No tienes permiso para agregar estudiantes a este curso');

    // Need to find user by email first - This might need a UserRepository method
    // For now assuming we have a way to get user ID by email via Supabase Admin or UserRepo
    // Simplification: We will require passing User ID from frontend or handle lookup elsewhere
    // If the requirement is strictly 'add student', usually by email.
    // Let's rely on the controller to resolve email -> ID if possible, or simpler:
    // The prompt says "POST /add-student".
    // I will use UserRepository here if I can import it, or just use direct client query.

    // NOTE: In a real scenario, I'd look up the user by email.
    // Since I don't have a `findByEmail` handy in `UserRepository.js` (I should check),
    // I will assume the prompt implies providing the student ID or I implement the lookup.
    // Let's implement lookup here using Supabase client directly for safety.

    const { data: users, error } = await this.enrollmentRepo.client
      .from('users')
      .select('id')
      .eq('email', studentEmail)
      .single();

    if (error || !users) throw new Error('Estudiante no encontrado con ese email');

    const studentId = users.id;

    const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, studentId);
    if (isEnrolled) throw new Error('El estudiante ya está inscrito');

    return await this.enrollmentRepo.save({
      course_id: course.id,
      student_id: studentId
    });
  }

  async getStudents(courseId, userId, role) {
    // Verify access
    if (role === 'teacher') {
        const course = await this.courseRepo.getById(courseId);
        if (course.teacher_id !== userId) throw new Error('No autorizado');
    } else {
        const isEnrolled = await this.enrollmentRepo.isEnrolled(courseId, userId);
        if (!isEnrolled) throw new Error('No autorizado');
    }

    return await this.enrollmentRepo.getCourseStudents(courseId);
  }
}
