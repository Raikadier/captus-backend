import InstitutionRepository from '../repositories/InstitutionRepository.js';
import GradingScaleRepository from '../repositories/GradingScaleRepository.js';
import AcademicPeriodRepository from '../repositories/AcademicPeriodRepository.js';
import CourseRepository from '../repositories/CourseRepository.js';
import EnrollmentRepository from '../repositories/EnrollmentRepository.js';
import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class AdminService {
  constructor() {
    this.institutionRepo   = new InstitutionRepository();
    this.gradingRepo       = new GradingScaleRepository();
    this.periodRepo        = new AcademicPeriodRepository();
    this.courseRepo        = new CourseRepository();
    this.enrollmentRepo    = new EnrollmentRepository();
  }

  // ── Institution ────────────────────────────────────────────────────────────

  async getMyInstitution(adminId) {
    return this.institutionRepo.findByUser(adminId);
  }

  async createInstitution(data, adminId) {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const institution = await this.institutionRepo.save({
      ...data,
      slug,
      created_by: adminId,
    });

    // Assign the creator as admin of the institution
    await this.institutionRepo.assignUser(adminId, institution.id);

    return institution;
  }

  async updateInstitution(id, data, adminId) {
    const inst = await this.institutionRepo.findById(id);
    if (!inst) throw new Error('Institución no encontrada');
    if (inst.created_by !== adminId) throw new Error('No autorizado');
    return this.institutionRepo.update(id, data);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async getMembers(institutionId, role = null) {
    return this.institutionRepo.getMembers(institutionId, role);
  }

  async inviteUserByEmail(email, institutionId, role = 'student') {
    const supabase = requireSupabaseClient();

    // Find user by email in public.users
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, institution_id')
      .eq('email', email)
      .single();

    if (error || !user) throw new Error('Usuario no encontrado. Debe registrarse en Captus primero.');
    if (user.institution_id && user.institution_id !== institutionId) {
      throw new Error('El usuario ya pertenece a otra institución.');
    }

    await this.institutionRepo.assignUser(user.id, institutionId);
    await this.institutionRepo.setUserRole(user.id, role);

    return { ...user, institution_id: institutionId, role };
  }

  async removeUserFromInstitution(userId, institutionId) {
    const supabase = requireSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (!user || user.institution_id !== institutionId) {
      throw new Error('El usuario no pertenece a esta institución.');
    }

    return this.institutionRepo.removeUser(userId);
  }

  async changeUserRole(userId, institutionId, newRole) {
    if (!['student', 'teacher', 'admin'].includes(newRole)) {
      throw new Error('Rol inválido. Valores permitidos: student, teacher, admin');
    }

    const supabase = requireSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (!user || user.institution_id !== institutionId) {
      throw new Error('El usuario no pertenece a esta institución.');
    }

    return this.institutionRepo.setUserRole(userId, newRole);
  }

  // ── Courses ────────────────────────────────────────────────────────────────

  async getInstitutionCourses(institutionId) {
    return this.institutionRepo.getCourses(institutionId);
  }

  async createCourseAsAdmin(data, adminId, institutionId) {
    const crypto = await import('crypto');
    let inviteCode;
    let isUnique = false;

    while (!isUnique) {
      inviteCode = crypto.default.randomBytes(3).toString('hex').toUpperCase();
      const existing = await this.courseRepo.findByInviteCode(inviteCode);
      if (!existing) isUnique = true;
    }

    // API sends { name, description }; courses table uses { title, description }
    // teacher_id uses admin as provisional owner until a teacher is assigned
    const { name, ...rest } = data;
    return this.courseRepo.save({
      ...rest,
      title:           name ?? rest.title,
      teacher_id:      rest.teacher_id ?? adminId,
      invite_code:     inviteCode,
      institution_id:  institutionId,
    });
  }

  async assignTeacherToCourse(courseId, teacherId, institutionId) {
    const supabase = requireSupabaseClient();

    // Verify teacher belongs to institution
    const { data: teacher } = await supabase
      .from('users')
      .select('id, role, institution_id')
      .eq('id', teacherId)
      .single();

    if (!teacher) throw new Error('Docente no encontrado.');
    if (teacher.institution_id !== institutionId) throw new Error('El docente no pertenece a esta institución.');
    if (teacher.role !== 'teacher' && teacher.role !== 'admin') throw new Error('El usuario no tiene rol de docente.');

    const { data, error } = await supabase
      .from('courses')
      .update({ teacher_id: teacherId })
      .eq('id', courseId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async bulkEnrollStudents(courseId, studentEmails, institutionId) {
    const supabase = requireSupabaseClient();

    const { data: students, error } = await supabase
      .from('users')
      .select('id, email, institution_id')
      .in('email', studentEmails)
      .eq('role', 'student');

    if (error) throw error;

    const results = { enrolled: [], skipped: [], notFound: [] };

    for (const email of studentEmails) {
      const student = students.find(s => s.email === email);
      if (!student) { results.notFound.push(email); continue; }
      if (student.institution_id !== institutionId) { results.skipped.push(email); continue; }

      const already = await this.enrollmentRepo.isEnrolled(courseId, student.id);
      if (already) { results.skipped.push(email); continue; }

      await this.enrollmentRepo.save({ course_id: courseId, student_id: student.id });
      results.enrolled.push(email);
    }

    return results;
  }

  // ── Grading Scales ─────────────────────────────────────────────────────────

  async getGradingScales(institutionId) {
    return this.gradingRepo.findByInstitution(institutionId);
  }

  async createGradingScale(data, institutionId) {
    return this.gradingRepo.save({ ...data, institution_id: institutionId });
  }

  async updateGradingScale(id, data, institutionId) {
    const scale = await this.gradingRepo.findById(id);
    if (!scale) throw new Error('Escala de calificación no encontrada.');
    if (scale.institution_id !== institutionId) throw new Error('No autorizado.');
    return this.gradingRepo.update(id, data);
  }

  async deleteGradingScale(id, institutionId) {
    const scale = await this.gradingRepo.findById(id);
    if (!scale) throw new Error('Escala de calificación no encontrada.');
    if (scale.institution_id !== institutionId) throw new Error('No autorizado.');
    if (scale.is_default) throw new Error('No puedes eliminar la escala predeterminada.');
    return this.gradingRepo.delete(id);
  }

  async setDefaultGradingScale(id, institutionId) {
    const scale = await this.gradingRepo.findById(id);
    if (!scale || scale.institution_id !== institutionId) throw new Error('No autorizado.');
    return this.gradingRepo.setDefault(id, institutionId);
  }

  // ── Academic Periods ───────────────────────────────────────────────────────

  async getPeriods(institutionId) {
    return this.periodRepo.findByInstitution(institutionId);
  }

  async createPeriod(data, institutionId) {
    return this.periodRepo.save({ ...data, institution_id: institutionId });
  }

  async updatePeriod(id, data, institutionId) {
    const period = await this.periodRepo.findById(id);
    if (!period || period.institution_id !== institutionId) throw new Error('No autorizado.');
    return this.periodRepo.update(id, data);
  }

  async deletePeriod(id, institutionId) {
    const period = await this.periodRepo.findById(id);
    if (!period || period.institution_id !== institutionId) throw new Error('No autorizado.');
    return this.periodRepo.delete(id);
  }

  async setActivePeriod(id, institutionId) {
    const period = await this.periodRepo.findById(id);
    if (!period || period.institution_id !== institutionId) throw new Error('No autorizado.');
    return this.periodRepo.setActive(id, institutionId);
  }

  // ── Stats / Reports ────────────────────────────────────────────────────────

  async getDashboardStats(institutionId) {
    const supabase = requireSupabaseClient();

    const [studentsRes, teachersRes, coursesRes, enrollmentsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('role', 'student'),
      supabase.from('users').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('role', 'teacher'),
      supabase.from('courses').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      supabase.from('course_enrollments')
        .select('id', { count: 'exact', head: true }),
    ]);

    return {
      students:    studentsRes.count    ?? 0,
      teachers:    teachersRes.count    ?? 0,
      courses:     coursesRes.count     ?? 0,
      enrollments: enrollmentsRes.count ?? 0,
    };
  }
}
