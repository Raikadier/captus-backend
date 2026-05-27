/**
 * src/services/AchievementCheckService.js
 *
 * Full recalculation of all achievements for a user.
 * Extracted from StatisticsService to keep statistics concerns separate
 * from gamification logic.
 *
 * Called by: StatisticsController.checkAchievements
 */
import StatisticsRepository from "../repositories/StatisticsRepository.js";
import UserAchievementsRepository from "../repositories/UserAchievementsRepository.js";
import { TaskService } from "./TaskService.js";
import { achievements } from "../shared/achievementsConfig.js";

const statisticsRepository = new StatisticsRepository();
const userAchievementsRepository = new UserAchievementsRepository();
const taskService = new TaskService();

export class AchievementCheckService {

  /**
   * Run a full achievement recalculation for the given user.
   * Iterates every known achievement and unlocks or updates progress.
   */
  async checkAchievements(userId) {
    try {
      if (!userId) return;

      const stats = await statisticsRepository.getByUser(userId);
      if (!stats) return;

      const additionalStats = await this.getAdditionalStats(userId);

      for (const [achievementId, achievement] of Object.entries(achievements)) {
        const hasAchievement = await userAchievementsRepository.hasAchievement(userId, achievementId);
        if (hasAchievement) continue;

        let currentValue = 0;
        let shouldUnlock = false;

        switch (achievement.type) {
          case "completed_tasks":    currentValue = stats.completedTasks;                  shouldUnlock = currentValue >= achievement.targetValue; break;
          case "streak":             currentValue = stats.racha;                           shouldUnlock = currentValue >= achievement.targetValue; break;
          case "tasks_created":      currentValue = stats.totalTasks;                      shouldUnlock = currentValue >= achievement.targetValue; break;
          case "high_priority_tasks":currentValue = additionalStats.highPriorityTasks;    shouldUnlock = currentValue >= achievement.targetValue; break;
          case "subtasks_created":   currentValue = additionalStats.subTasksCreated;      shouldUnlock = currentValue >= achievement.targetValue; break;
          case "early_tasks":        currentValue = additionalStats.earlyTasks;           shouldUnlock = currentValue >= achievement.targetValue; break;
          case "subtasks_completed": currentValue = additionalStats.subTasksCompleted;    shouldUnlock = currentValue >= achievement.targetValue; break;
          case "tasks_in_day":       currentValue = additionalStats.maxTasksInDay;        shouldUnlock = currentValue >= achievement.targetValue; break;
          case "solo_tasks":         currentValue = additionalStats.soloTasks;            shouldUnlock = currentValue >= achievement.targetValue; break;
          case "sunday_tasks":       currentValue = additionalStats.sundayTasks;          shouldUnlock = currentValue >= achievement.targetValue; break;
        }

        if (shouldUnlock) {
          await userAchievementsRepository.unlockAchievement(userId, achievementId, currentValue);
        } else if (this.isProgressAchievement(achievement.type)) {
          await userAchievementsRepository.updateProgress(userId, achievementId, currentValue);
        }
      }
    } catch (error) {
      console.error("Error verificando logros:", error);
    }
  }

  /** Aggregate stats needed for achievement threshold checks. */
  async getAdditionalStats(userId) {
    try {
      const allTasksResult = await taskService.getAll(userId);
      const allTasks = allTasksResult.success ? allTasksResult.data : [];

      let highPriorityTasks = 0;
      let earlyTasks = 0;
      let sundayTasks = 0;
      let soloTasks = 0;
      const tasksByDay = {};

      allTasks.forEach(task => {
        if (task.priority_id === 3 || task.id_Priority === 3) highPriorityTasks++;

        const isCompleted = task.completed || task.state;
        const endDate = task.due_date || task.endDate;

        if (isCompleted && endDate) {
          const completionTime = new Date(endDate);
          if (completionTime.getHours() < 9) earlyTasks++;
          if (completionTime.getDay() === 0) sundayTasks++;

          const dayKey = completionTime.toDateString();
          tasksByDay[dayKey] = (tasksByDay[dayKey] || 0) + 1;
        }
      });

      return {
        highPriorityTasks,
        earlyTasks,
        sundayTasks,
        soloTasks,
        subTasksCreated:   0, // Placeholder
        subTasksCompleted: 0, // Placeholder
        maxTasksInDay: Math.max(...Object.values(tasksByDay), 0),
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas para logros:", error);
      return { highPriorityTasks: 0, earlyTasks: 0, sundayTasks: 0, soloTasks: 0, subTasksCreated: 0, subTasksCompleted: 0, maxTasksInDay: 0 };
    }
  }

  isProgressAchievement(type) {
    return ["completed_tasks", "streak", "tasks_created", "high_priority_tasks",
            "subtasks_created", "early_tasks", "subtasks_completed", "sunday_tasks"].includes(type);
  }
}
