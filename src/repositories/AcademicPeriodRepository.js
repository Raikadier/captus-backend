import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class AcademicPeriodRepository {
  constructor() {
    this.client = requireSupabaseClient();
  }

  async findByInstitution(institutionId) {
    const { data, error } = await this.client
      .from('academic_periods')
      .select('*')
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('academic_periods')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async save(payload) {
    const { data, error } = await this.client
      .from('academic_periods')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, payload) {
    const { data, error } = await this.client
      .from('academic_periods')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id) {
    const { error } = await this.client
      .from('academic_periods')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { id };
  }

  async setActive(id, institutionId) {
    await this.client
      .from('academic_periods')
      .update({ is_active: false })
      .eq('institution_id', institutionId);

    const { data, error } = await this.client
      .from('academic_periods')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
