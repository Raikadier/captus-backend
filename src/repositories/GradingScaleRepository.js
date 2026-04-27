import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class GradingScaleRepository {
  constructor() {
    this.client = requireSupabaseClient();
  }

  async findByInstitution(institutionId) {
    const { data, error } = await this.client
      .from('grading_scales')
      .select('*, grading_scale_levels(*)')
      .eq('institution_id', institutionId)
      .order('created_at');
    if (error) throw error;
    return data;
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('grading_scales')
      .select('*, grading_scale_levels(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  /** Maps frontend { min, max } → DB { min_value, max_value } */
  _levelToDb(level, scaleId) {
    return {
      scale_id:  scaleId,
      label:     level.label,
      min_value: level.min_value ?? level.min,
      max_value: level.max_value ?? level.max,
      color:     level.color ?? '#22c55e',
    };
  }

  async save(payload) {
    const { levels, ...scaleData } = payload;

    const { data: scale, error } = await this.client
      .from('grading_scales')
      .insert(scaleData)
      .select()
      .single();
    if (error) throw error;

    if (levels?.length) {
      const { error: levelsError } = await this.client
        .from('grading_scale_levels')
        .insert(levels.map(l => this._levelToDb(l, scale.id)));
      if (levelsError) throw levelsError;
    }

    return this.findById(scale.id);
  }

  async update(id, payload) {
    const { levels, ...scaleData } = payload;

    const { data: scale, error } = await this.client
      .from('grading_scales')
      .update(scaleData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (levels) {
      await this.client.from('grading_scale_levels').delete().eq('scale_id', id);
      if (levels.length) {
        const { error: levelsError } = await this.client
          .from('grading_scale_levels')
          .insert(levels.map(l => this._levelToDb(l, id)));
        if (levelsError) throw levelsError;
      }
    }

    return this.findById(scale.id);
  }

  async delete(id) {
    const { error } = await this.client
      .from('grading_scales')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { id };
  }

  async setDefault(id, institutionId) {
    await this.client
      .from('grading_scales')
      .update({ is_default: false })
      .eq('institution_id', institutionId);

    const { data, error } = await this.client
      .from('grading_scales')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
