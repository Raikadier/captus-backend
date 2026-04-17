import BaseRepository from "./BaseRepository.js";

// Mapping to match Frontend expectations directly
const mapFromDb = (row) => ({
  id: row.id,
  user_id: row.user_id,
  title: row.title,
  description: row.description,
  start_date: row.start_date,
  end_date: row.end_date,
  created_at: row.created_at,
  updated_at: row.updated_at,
  type: row.type,
  is_past: row.is_past,
  notify: row.notify,
});

const mapToDb = (entity) => ({
  user_id: entity.user_id,
  title: entity.title,
  description: entity.description ?? null,
  start_date: entity.start_date,
  end_date: entity.end_date ?? null,
  type: entity.type,
  is_past: entity.is_past ?? false,
  notify: entity.notify ?? false,
});

class EventsRepository extends BaseRepository {
  constructor() {
    super("events", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async save(event) {
    return super.save(event);
  }

  async update(event) {
    const id = event.id;
    if (!id) return null;
    return super.update(id, event);
  }

  async getAllByUserId(userId) {
    if (!userId) return [];
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getUpcomingByUserId(userId, limit = null) {
    if (!userId) return [];
    const now = new Date().toISOString();
    let query = this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("is_past", false)
      .gte("start_date", now)
      .order("start_date", { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getByDateRange(userId, startDate, endDate) {
    if (!userId || !startDate || !endDate) return [];

    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .gte("start_date", startDate)
      .lte("start_date", endDate)
      .order("start_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async markAsPast(eventId) {
    if (!eventId) return null;

    const { data, error } = await this.client
      .from(this.tableName)
      .update({ is_past: true, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapFromDb(data);
  }

  async deleteByUser(userId) {
    if (!userId) return true;
    const { error } = await this.client.from(this.tableName).delete().eq("user_id", userId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
}

export default EventsRepository;