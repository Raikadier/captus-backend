export default class Statistics {
  constructor({
    id_Statistics = null,
    id_User,
    startDate = new Date(),
    endDate = null,
    lastRachaDate = null,
    racha = 0,
    totalTasks = 0,
    completedTasks = 0,
    dailyGoal = 5,
    bestStreak = 0,
    favoriteCategory = null,
  }) {
    this.id_Statistics = id_Statistics;
    this.id_User = id_User;
    this.startDate = startDate;
    this.endDate = endDate;
    this.lastRachaDate = lastRachaDate;
    this.racha = racha;
    this.totalTasks = totalTasks;
    this.completedTasks = completedTasks;
    this.dailyGoal = dailyGoal;
    this.bestStreak = bestStreak;
    this.favoriteCategory = favoriteCategory;
  }
}
