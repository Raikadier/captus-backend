import { requireSupabaseClient } from '../lib/supabaseAdmin.js';

export default class BaseRepository {
  constructor(tableName, { primaryKey = 'id', mapToDb, mapFromDb, select = '*' } = {}) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.mapToDb = mapToDb || ((entity) => entity);
    this.mapFromDb = mapFromDb || ((row) => row);
    this.select = select;
  }

  get client() {
    return requireSupabaseClient();
  }

  async save(entity) {
    const payload = this.mapToDb(entity);
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(payload)
      .select(this.select)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapFromDb(data);
  }

  async update(id, entity) {
    const payload = this.mapToDb(entity);
    const { data, error } = await this.client
      .from(this.tableName)
      .update(payload)
      .eq(this.primaryKey, id)
      .select(this.select)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapFromDb(data);
  }

  async delete(id) {
    const { error } = await this.client.from(this.tableName).delete().eq(this.primaryKey, id);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  async getById(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(this.select)
      .eq(this.primaryKey, id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(error.message);
    }

    return this.mapFromDb(data);
  }

  async getAll(match = {}) {
    let query = this.client.from(this.tableName).select(this.select);
    Object.entries(match).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return data.map(this.mapFromDb);
  }
}
