// src/controllers/UserAchievementsController.js
import { UserAchievementsService } from "../services/UserAchievementsService.js";

const userAchievementsService = new UserAchievementsService();

export class UserAchievementsController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        userAchievementsService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getMyAchievements(req, res) {
    const result = await userAchievementsService.getMyAchievements();
    res.status(result.success ? 200 : 401).json(result);
  }

  async getByUser(req, res) {
    const { userId } = req.params;
    const result = await userAchievementsService.getByUser(parseInt(userId));
    res.status(result.success ? 200 : 404).json(result);
  }

  async getStats(req, res) {
    const result = await userAchievementsService.getAchievementStats(req.user.id);
    res.status(result.success ? 200 : 500).json(result);
  }

  async hasAchievement(req, res) {
    const { achievementId } = req.params;
    const result = await userAchievementsService.hasAchievement(req.user.id, achievementId);
    res.status(result.success ? 200 : 400).json(result);
  }

  async unlockAchievement(req, res) {
    const { achievementId } = req.params;
    const { progress } = req.body;
    const result = await userAchievementsService.unlockAchievement(req.user.id, achievementId, progress || 0);
    res.status(result.success ? 201 : 400).json(result);
  }

  async updateProgress(req, res) {
    const { achievementId } = req.params;
    const { progress } = req.body;

    if (progress === undefined || progress < 0) {
      return res.status(400).json({
        success: false,
        message: "Progreso requerido y debe ser mayor o igual a 0."
      });
    }

    const result = await userAchievementsService.updateProgress(req.user.id, achievementId, progress);
    res.status(result.success ? 200 : 400).json(result);
  }

  async resetAchievements(req, res) {
    const result = await userAchievementsService.resetUserAchievements(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async recalculateAll(req, res) {
    try {
      const { AchievementValidatorService } = await import("../services/AchievementValidatorService.js");
      const validator = new AchievementValidatorService();
      validator.setCurrentUser(req.user);

      const updatedCount = await validator.recalculateAllAchievements(req.user.id);

      res.status(200).json({
        success: true,
        message: `Recalculados ${updatedCount} logros`,
        updatedCount
      });
    } catch (error) {
      console.error('Error recalculating achievements:', error);
      res.status(500).json({
        success: false,
        message: 'Error al recalcular logros'
      });
    }
  }
}