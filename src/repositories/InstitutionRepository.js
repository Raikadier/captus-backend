import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class InstitutionRepository {
  constructor() {
    this.client = requireSupabaseClient();
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('institutions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async findByAdmin(adminId) {
    const { data, error } = await this.client
      .from('institutions')
      .select('*')
      .eq('created_by', adminId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async findByUser(userId) {
    // Use explicit FK name to avoid PGRST201 ambiguity:
    // migration 002 added institutions.created_by→public.users FK,
    // creating a second relationship between users↔institutions.
    const { data, error } = await this.client
      .from('users')
      .select('institution_id, institutions!users_institution_id_fkey(*)')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.institutions ?? null;
  }

  async save(payload) {
    const { data, error } = await this.client
      .from('institutions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, payload) {
    const { data, error } = await this.client
      .from('institutions')
      .update({ ...payload, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getMembers(institutionId, role = null) {
    let query = this.client
      .from('users')
      .select('id, name, email, role, "avatarUrl", created_at')
      .eq('institution_id', institutionId)
      .order('name');

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async assignUser(userId, institutionId) {
    const { data, error } = await this.client
      .from('users')
      .update({ institution_id: institutionId, updated_at: new Date() })
      .eq('id', userId)
      .select('id, name, email, role')
      .single();
    if (error) throw error;
    return data;
  }

  async removeUser(userId) {
    const { data, error } = await this.client
      .from('users')
      .update({ institution_id: null, updated_at: new Date() })
      .eq('id', userId)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  async setUserRole(userId, role) {
    const { data, error } = await this.client
      .from('users')
      .update({ role, updated_at: new Date() })
      .eq('id', userId)
      .select('id, name, email, role')
      .single();
    if (error) throw error;
    return data;
  }

  async getCourses(institutionId) {
    const { data, error } = await this.client
      .from('courses')
      .select(`
        id, title, description, invite_code, created_at,
        teacher_id, grading_scale_id, period_id,
        teacher:users!courses_teacher_id_fkey(id, name, email),
        period:academic_periods(id, name),
        enrollments:course_enrollments(count)
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getCourseStudents(courseId) {
    const { data, error } = await this.client
      .from('course_enrollments')
      .select('id, enrolled_at, student:users!course_enrollments_student_id_fkey(id, name, email, "avatarUrl", role)')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(e => ({ ...e.student, enrolled_at: e.enrolled_at, enrollment_id: e.id }));
  }

  async unenrollStudent(courseId, studentId) {
    const { error } = await this.client
      .from('course_enrollments')
      .delete()
      .eq('course_id', courseId)
      .eq('student_id', studentId);
    if (error) throw error;
  }

  async updateCourse(courseId, institutionId, payload) {
    const { data, error } = await this.client
      .from('courses')
      .update({ ...payload, updated_at: new Date() })
      .eq('id', courseId)
      .eq('institution_id', institutionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async broadcastNotification(userIds, { title, body, type = 'system' }) {
    if (!userIds.length) return 0;
    const rows = userIds.map(uid => ({ user_id: uid, title, body, type }));
    const { error, count } = await this.client
      .from('notifications')
      .insert(rows, { count: 'exact' });
    if (error) throw error;
    return count ?? rows.length;
  }

  async assignCourseToInstitution(courseId, institutionId, periodId = null) {
    const update = { institution_id: institutionId };
    if (periodId) update.period_id = periodId;

    const { data, error } = await this.client
      .from('courses')
      .update(update)
      .eq('id', courseId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
