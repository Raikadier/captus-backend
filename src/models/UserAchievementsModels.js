export default class UserAchievements {
  constructor({
    id = null,
    id_User,
    achievementId,
    unlockedAt = new Date(),
    progress = 0,
    isCompleted = false,
  }) {
    this.id = id; // PK
    this.id_User = id_User; // FK
    this.achievementId = achievementId;
    this.unlockedAt = unlockedAt;
    this.progress = progress;
    this.isCompleted = isCompleted;
  }
}
