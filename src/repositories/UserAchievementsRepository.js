import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  id_User: row.id_User,
  achievementId: row.achievementId,
  progress: row.progress,
  isCompleted: row.isCompleted,
  unlockedAt: row.unlockedAt,
});

const mapToDb = (entity) => ({
  id_User: entity.id_User,
  achievementId: entity.achievementId,
  progress: entity.progress ?? 0,
  isCompleted: entity.isCompleted ?? false,
  unlockedAt: entity.unlockedAt ?? new Date().toISOString(),
});

class UserAchievementsRepository extends BaseRepository {
  constructor() {
    super("userAchievements", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  async getByUser(userId) {
    if (!userId) return [];
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("id_User", userId)
      .order("unlockedAt", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(mapFromDb);
  }

  async getByUserAndAchievement(userId, achievementId) {
    if (!userId || !achievementId) return null;
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("id_User", userId)
      .eq("achievementId", achievementId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }

    return data ? mapFromDb(data) : null;
  }

  async hasAchievement(userId, achievementId) {
    const achievement = await this.getByUserAndAchievement(userId, achievementId);
    return achievement !== null;
  }

  async unlockAchievement(userId, achievementId, progress = 0) {
    if (!userId || !achievementId) return false;

    const existing = await this.getByUserAndAchievement(userId, achievementId);
    if (existing) {
      return this.updateProgress(userId, achievementId, progress, true);
    }

    await this.save({
      id_User: userId,
      achievementId,
      progress,
      isCompleted: true,
      unlockedAt: new Date().toISOString(),
    });

    return true;
  }

  async updateProgress(userId, achievementId, progress, complete = false) {
    const payload = {
      progress,
    };

    if (complete) {
      payload.isCompleted = true;
      payload.unlockedAt = new Date().toISOString();
    }

    const { error } = await this.client
      .from(this.tableName)
      .update(payload)
      .eq("id_User", userId)
      .eq("achievementId", achievementId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  async getAchievementStats(userId) {
    const achievements = await this.getByUser(userId);
    const completed = achievements.filter((a) => a.isCompleted).length;
    const total = achievements.length;

    return {
      totalAchievements: total,
      completedAchievements: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async delete(userId, achievementId) {
    if (!userId || !achievementId) return false;
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq("id_User", userId)
      .eq("achievementId", achievementId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }
}

export default UserAchievementsRepository;
