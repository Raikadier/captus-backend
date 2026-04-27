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
    const { data, error } = await this.client
      .from('users')
      .select('institution_id, institutions(*)')
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
      .select('id, name, email, role, avatar_url, created_at')
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
        teacher:users!courses_teacher_id_fkey(id, name, email),
        period:academic_periods(id, name),
        enrollments:course_enrollments(count)
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
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
