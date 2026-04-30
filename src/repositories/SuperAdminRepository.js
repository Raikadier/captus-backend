import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class SuperAdminRepository {
  constructor() {
    this.client = requireSupabaseClient();
  }

  // ── Platform stats ─────────────────────────────────────────────────────────

  async getPlatformStats() {
    const [instRes, usersRes, coursesRes, enrollRes] = await Promise.all([
      this.client.from('institutions').select('id', { count: 'exact', head: true }),
      this.client.from('users').select('id', { count: 'exact', head: true }),
      this.client.from('courses').select('id', { count: 'exact', head: true }),
      this.client.from('course_enrollments').select('id', { count: 'exact', head: true }),
    ]);

    // Active vs inactive institutions
    const { count: activeInst } = await this.client
      .from('institutions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // Users by role
    const { data: byRole } = await this.client
      .from('users')
      .select('role')
      .then(({ data }) => ({
        data: (data ?? []).reduce((acc, u) => {
          acc[u.role] = (acc[u.role] ?? 0) + 1;
          return acc;
        }, {}),
      }));

    return {
      institutions: { total: instRes.count ?? 0, active: activeInst ?? 0 },
      users:        { total: usersRes.count ?? 0, byRole: byRole ?? {} },
      courses:      coursesRes.count ?? 0,
      enrollments:  enrollRes.count  ?? 0,
    };
  }

  // ── Institutions ───────────────────────────────────────────────────────────

  async listInstitutions({ page = 1, limit = 20, search = '' } = {}) {
    const offset = (page - 1) * limit;

    // After migration 002, created_by FK points to public.users → join works
    let query = this.client
      .from('institutions')
      .select(`
        id, name, slug, email, phone, address, website,
        is_active, created_at, disabled_at, disabled_reason,
        created_by,
        owner:users!institutions_created_by_fkey(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count ?? 0, page, limit };
  }

  async getInstitutionDetail(id) {
    // After migration 002, created_by FK points to public.users → join works
    const { data: inst, error } = await this.client
      .from('institutions')
      .select(`
        *,
        owner:users!institutions_created_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;

    // Stats for this institution
    const [membersRes, coursesRes, enrollRes] = await Promise.all([
      this.client.from('users').select('id', { count: 'exact', head: true })
        .eq('institution_id', id),
      this.client.from('courses').select('id', { count: 'exact', head: true })
        .eq('institution_id', id),
      this.client.from('course_enrollments')
        .select('id', { count: 'exact', head: true }),
    ]);

    // Members by role
    const { data: roles } = await this.client
      .from('users')
      .select('role')
      .eq('institution_id', id);

    const byRole = (roles ?? []).reduce((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {});

    return {
      ...inst,
      stats: {
        members:     membersRes.count  ?? 0,
        courses:     coursesRes.count  ?? 0,
        enrollments: enrollRes.count   ?? 0,
        byRole,
      },
    };
  }

  async updateInstitution(id, payload) {
    const { data, error } = await this.client
      .from('institutions')
      .update({ ...payload, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async setInstitutionActive(id, isActive, reason = null) {
    const patch = {
      is_active:       isActive,
      disabled_at:     isActive ? null : new Date(),
      disabled_reason: isActive ? null : reason,
      updated_at:      new Date(),
    };
    const { data, error } = await this.client
      .from('institutions')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ── Users (global) ─────────────────────────────────────────────────────────

  async listUsers({ page = 1, limit = 20, search = '', role = null, institutionId = null } = {}) {
    const offset = (page - 1) * limit;

    let query = this.client
      .from('users')
      .select(`
        id, name, email, role, institution_id, created_at,
        institution:institutions(id, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search)        query = query.ilike('email', `%${search}%`);
    if (role)          query = query.eq('role', role);
    if (institutionId) query = query.eq('institution_id', institutionId);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count ?? 0, page, limit };
  }

  async changeUserRole(userId, newRole) {
    const { data, error } = await this.client
      .from('users')
      .update({ role: newRole, updated_at: new Date() })
      .eq('id', userId)
      .select('id, name, email, role, institution_id')
      .single();
    if (error) throw error;
    return data;
  }

  async removeUserFromInstitution(userId) {
    const { data, error } = await this.client
      .from('users')
      .update({ institution_id: null, updated_at: new Date() })
      .eq('id', userId)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async writeAuditLog({ actorId, action, targetType, targetId, payload, ipAddress }) {
    const { error } = await this.client
      .from('superadmin_audit_log')
      .insert({
        actor_id:    actorId,
        action,
        target_type: targetType,
        target_id:   targetId ?? null,
        payload:     payload  ?? null,
        ip_address:  ipAddress ?? null,
      });
    if (error) console.error('[AuditLog] write failed:', error.message);
  }

  async getAuditLog({ page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.client
      .from('superadmin_audit_log')
      .select(`
        id, action, target_type, target_id, payload, ip_address, created_at,
        actor:users!superadmin_audit_log_actor_id_fkey(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data, total: count ?? 0, page, limit };
  }
}
