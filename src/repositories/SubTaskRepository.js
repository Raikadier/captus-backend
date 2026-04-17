import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_SubTask: row.id_SubTask,
  title: row.title,
  description: row.description,
  creationDate: row.creationDate,
  endDate: row.endDate,
  id_Priority: row.id_Priority,
  id_Category: row.id_Category,
  state: row.state,
  id_Task: row.id_Task,
});

const mapToDb = (entity) => ({
  title: entity.title,
  description: entity.description ?? null,
  endDate: entity.endDate ?? null,
  id_Priority: entity.id_Priority ?? null,
  id_Category: entity.id_Category ?? null,
  state: entity.state ?? false,
  id_Task: entity.id_Task ?? null,
});

class SubTaskRepository extends BaseRepository {
  constructor() {
    super("subTask", {
      primaryKey: "id_SubTask",
      mapFromDb,
      mapToDb,
    });
  }

  async save(subTask) {
    return super.save(subTask);
  }

  async getAllByTaskId(taskId) {
    if (!taskId) return [];
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("id_Task", taskId)
      .order("creationDate", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getById(id) {
    return super.getById(id);
  }

  async update(subTask) {
    if (!subTask?.id_SubTask) return null;
    return super.update(subTask.id_SubTask, subTask);
  }

  async delete(id) {
    if (!id) return false;
    const { error } = await this.client.from(this.tableName).delete().eq("id_SubTask", id);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  async markAllAsCompleted(taskId) {
    if (!taskId) return false;
    const { error } = await this.client
      .from(this.tableName)
      .update({ state: true })
      .eq("id_Task", taskId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

}

export default SubTaskRepository;
