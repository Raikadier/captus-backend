import BaseRepository from "./BaseRepository.js";

// Mapping to match Frontend expectations directly
const mapFromDb = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  created_at: row.created_at,
  due_date: row.due_date,
  priority_id: row.priority_id,
  category_id: row.category_id,
  completed: row.completed,
  user_id: row.user_id,
  updated_at: row.updated_at,
  // Keeping legacy properties for safety if backend logic relies on them
  id_Task: row.id,
  state: row.completed,
  creationDate: row.created_at,
  endDate: row.due_date,
  id_Priority: row.priority_id,
  id_Category: row.category_id,
  id_User: row.user_id,
  project_id: row.project_id, // New field
});

const mapToDb = (entity) => ({
  // Handles both legacy (id_Task) and new (id) formats
  title: entity.title,
  description: entity.description ?? null,
  due_date: entity.due_date ?? entity.endDate ?? null,
  priority_id: entity.priority_id ?? entity.id_Priority ?? null,
  category_id: entity.category_id ?? entity.id_Category ?? null,
  completed: entity.completed ?? entity.state ?? false,
  user_id: entity.user_id ?? entity.id_User,
  project_id: entity.project_id, // New field
});

class TaskRepository extends BaseRepository {
  constructor() {
    super("tasks", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async save(task) {
    return super.save(task);
  }

  async update(task) {
    const id = task.id ?? task.id_Task;
    if (!id) return null;
    return super.update(id, task);
  }

  async getAllByUserId(userId) {
    if (!userId) return [];
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getOverdueByUser(userId) {
    if (!userId) return [];
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("completed", false)
      .lt("due_date", now);

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getCompletedToday(userId) {
    if (!userId) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("updated_at", startOfDay.toISOString())
      .lt("updated_at", endOfDay.toISOString());

    if (error) throw new Error(error.message);
    return data.map(mapFromDb);
  }

  async deleteByUser(userId) {
    if (!userId) return true;
    const { error } = await this.client.from(this.tableName).delete().eq("user_id", userId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  async deleteByCategory(categoryId) {
    if (!categoryId) return true;
    const { error } = await this.client.from(this.tableName).delete().eq("category_id", categoryId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
}

export default TaskRepository;
