import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_Statistics: row.id_Statistics,
  id_User: row.id_User,
  startDate: row.startDate,
  endDate: row.endDate,
  lastRachaDate: row.lastRachaDate,
  racha: row.racha,
  totalTasks: row.totalTasks,
  completedTasks: row.completedTasks,
  dailyGoal: row.dailyGoal,
  bestStreak: row.bestStreak,
  favoriteCategory: row.favoriteCategory,
});

const mapToDb = (entity) => ({
  id_User: entity.id_User,
  startDate: entity.startDate ?? null,
  endDate: entity.endDate ?? null,
  lastRachaDate: entity.lastRachaDate ?? null,
  racha: entity.racha ?? 0,
  totalTasks: entity.totalTasks ?? 0,
  completedTasks: entity.completedTasks ?? 0,
  dailyGoal: entity.dailyGoal ?? 5,
  bestStreak: entity.bestStreak ?? 0,
  favoriteCategory: entity.favoriteCategory ?? null,
});

export default class StatisticsRepository extends BaseRepository {
  constructor() {
    super("statistics", {
      primaryKey: "id_Statistics",
      mapFromDb,
      mapToDb,
    });
  }

  async getByUser(userId) {
    if (!userId) return null;
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("id_User", userId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }

    return data ? mapFromDb(data) : null;
  }

  async update(statistics) {
    if (!statistics?.id_User) return null;
    const result = await this.client
      .from(this.tableName)
      .update(mapToDb(statistics))
      .eq("id_User", statistics.id_User)
      .select("*")
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data ? mapFromDb(result.data) : null;
  }

  async delete(userId) {
    if (!userId) return false;
    const { error } = await this.client.from(this.tableName).delete().eq("id_User", userId);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  defaultStatistics(userId) {
    return {
      id_User: userId,
      startDate: new Date(),
      endDate: new Date(),
      racha: 0,
      totalTasks: 0,
      completedTasks: 0,
      dailyGoal: 5,
      bestStreak: 0,
      lastRachaDate: null,
      favoriteCategory: null,
    };
  }
}
