import UserAchievementsRepository from "../repositories/UserAchievementsRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const userAchievementsRepository = new UserAchievementsRepository();

export class UserAchievementsService {
  constructor() {
    this.currentUser = null;
  }

  // Método para establecer el usuario actual (desde middleware de auth)
  setCurrentUser(user) {
    this.currentUser = user;
  }

  async getByUser(userId) {
    try {
      if (!userId) {
        return new OperationResult(false, "ID de usuario requerido.");
      }

      const achievements = await userAchievementsRepository.getByUser(userId);
      console.log(`🎯 User ${userId} achievements from DB:`, achievements);
      console.log(`📊 Found ${achievements.length} achievements for user ${userId}`);
      return new OperationResult(true, "Logros obtenidos exitosamente.", achievements);
    } catch (error) {
      console.error(`❌ Error getting achievements for user ${userId}:`, error);
      return new OperationResult(false, `Error al obtener logros: ${error.message}`);
    }
  }

  async getMyAchievements() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      return await this.getByUser(this.currentUser.id);
    } catch (error) {
      return new OperationResult(false, `Error al obtener logros: ${error.message}`);
    }
  }

  async hasAchievement(userId, achievementId) {
    try {
      if (!userId || !achievementId) {
        return new OperationResult(false, "ID de usuario y logro requeridos.");
      }

      const hasAchievement = await userAchievementsRepository.hasAchievement(userId, achievementId);
      return new OperationResult(true, "Verificación completada.", { hasAchievement });
    } catch (error) {
      return new OperationResult(false, `Error al verificar logro: ${error.message}`);
    }
  }

  async unlockAchievement(userId, achievementId, progress = 0) {
    try {
      if (!userId || !achievementId) {
        return new OperationResult(false, "ID de usuario y logro requeridos.");
      }

      // Verificar si ya tiene el logro
      const existing = await userAchievementsRepository.getByUserAndAchievement(userId, achievementId);
      if (existing && existing.isCompleted) {
        return new OperationResult(false, "El usuario ya tiene este logro desbloqueado.");
      }

      const unlocked = await userAchievementsRepository.unlockAchievement(userId, achievementId, progress);
      if (unlocked) {
        return new OperationResult(true, "Logro desbloqueado exitosamente.");
      } else {
        return new OperationResult(false, "Error al desbloquear logro.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al desbloquear logro: ${error.message}`);
    }
  }

  async updateProgress(userId, achievementId, progress) {
    try {
      if (!userId || !achievementId || progress < 0) {
        return new OperationResult(false, "Parámetros inválidos.");
      }

      const updated = await userAchievementsRepository.updateProgress(userId, achievementId, progress);
      if (updated) {
        return new OperationResult(true, "Progreso actualizado exitosamente.");
      } else {
        return new OperationResult(false, "Error al actualizar progreso.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar progreso: ${error.message}`);
    }
  }

  async getAchievementStats(userId) {
    try {
      if (!userId) {
        return new OperationResult(false, "ID de usuario requerido.");
      }

      const stats = await userAchievementsRepository.getAchievementStats(userId);
      return new OperationResult(true, "Estadísticas obtenidas exitosamente.", stats);
    } catch (error) {
      return new OperationResult(false, `Error al obtener estadísticas: ${error.message}`);
    }
  }

  async resetUserAchievements(userId) {
    try {
      if (!userId) {
        return new OperationResult(false, "ID de usuario requerido.");
      }


      const achievements = await userAchievementsRepository.getByUser(userId);


      for (const achievement of achievements) {
        await userAchievementsRepository.delete(achievement.id_User, achievement.achievementId);
      }

      return new OperationResult(true, "Logros reseteados exitosamente.");
    } catch (error) {
      return new OperationResult(false, `Error al resetear logros: ${error.message}`);
    }
  }

  async delete(userId, achievementId) {
    try {
      // Este método no está expuesto en rutas por seguridad
      // Solo para uso interno si es necesario
      const deleted = await userAchievementsRepository.delete(userId, achievementId);
      return deleted;
    } catch (error) {
      console.error("Error eliminando logro:", error);
      return false;
    }
  }
}