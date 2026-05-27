import { achievements } from "../shared/achievementsConfig.js";
import UserAchievementsRepository from "../repositories/UserAchievementsRepository.js";
import TaskRepository from "../repositories/TaskRepository.js";
import { requireSupabaseClient } from "../lib/supabaseAdmin.js";

const userAchievementsRepository = new UserAchievementsRepository();
const taskRepository = new TaskRepository();

export class AchievementValidatorService {
  constructor() {
    this.client = requireSupabaseClient();
  }

  /**
   * Valida todos los logros para un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Array de logros desbloqueados
   */
  async validateAllAchievements(userId) {
    if (!userId) return [];

    const unlockedAchievements = [];

    for (const [achievementId, achievement] of Object.entries(achievements)) {
      try {
        const isUnlocked = await this.validateAchievement(userId, achievementId);
        if (isUnlocked) {
          unlockedAchievements.push({
            achievementId,
            achievement,
            unlockedAt: new Date()
          });
        }
      } catch (error) {
        console.error(`Error validating achievement ${achievementId}:`, error);
      }
    }

    return unlockedAchievements;
  }

  /**
   * Valida un logro específico para un usuario
   * @param {string} userId - ID del usuario
   * @param {string} achievementId - ID del logro
   * @param {Array} preFetchedTasks - Tareas pre-cargadas para optimización
   * @returns {Promise<boolean>} - True si el logro debe ser desbloqueado
   */
  async validateAchievement(userId, achievementId, preFetchedTasks = null) {
    // console.log(`🏆 Validating achievement: ${achievementId} for user ${userId}`);

    // Verificar si ya tiene el logro desbloqueado
    const existing = await userAchievementsRepository.getByUserAndAchievement(userId, achievementId);
    if (existing && existing.isCompleted) {
      // console.log(`✅ ${achievementId} already unlocked`);
      // Si ya está desbloqueado, solo actualizar el progreso si es mayor
      const achievement = achievements[achievementId];
      if (achievement) {
        const progress = await this.calculateProgress(userId, achievement, preFetchedTasks);
        // console.log(`📊 ${achievementId}: current progress ${existing.progress}, calculated ${progress}`);
        if (progress > existing.progress) {
          await userAchievementsRepository.updateProgress(userId, achievementId, progress);
          // console.log(`📈 Updated progress for already unlocked achievement ${achievementId}`);
        }
      }
      return false;
    }

    const achievement = achievements[achievementId];
    if (!achievement) {
      console.log(`❌ Achievement ${achievementId} not found`);
      return false;
    }

    const progress = await this.calculateProgress(userId, achievement, preFetchedTasks);
    // console.log(`📊 ${achievementId}: ${progress}/${achievement.targetValue}`);

    // Si el progreso alcanza el objetivo, desbloquear el logro
    if (progress >= achievement.targetValue) {
      console.log(`🎉 UNLOCKING ${achievementId}!`);
      await userAchievementsRepository.unlockAchievement(userId, achievementId, progress);

      // Logro desbloqueado - se mostrará popup en frontend
      console.log(`🎊 Achievement ${achievementId} unlocked for user ${userId}!`);

      return true;
    }

    // Actualizar progreso
    if (existing) {
      await userAchievementsRepository.updateProgress(userId, achievementId, progress);
    } else if (progress > 0) {
      await userAchievementsRepository.save({
        id_User: userId,
        achievementId,
        progress,
        isCompleted: false,
        unlockedAt: null,
      });
    }

    return false;
  }

  /**
   * Calcula el progreso actual de un logro para un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} achievement - Configuración del logro
   * @param {Array} preFetchedTasks - Tareas pre-cargadas
   * @returns {Promise<number>} - Progreso actual
   */
  async calculateProgress(userId, achievement, preFetchedTasks = null) {
    switch (achievement.type) {
      case 'completed_tasks':
        return await this.getCompletedTasksCount(userId, preFetchedTasks);

      case 'high_priority_tasks':
        return await this.getHighPriorityTasksCount(userId);

      case 'subtasks_created':
        return await this.getSubtasksCreatedCount(userId, preFetchedTasks);

      case 'tasks_created':
        return await this.getTasksCreatedCount(userId, preFetchedTasks);

      case 'streak':
        return await this.getCurrentStreak(userId);

      case 'early_tasks':
        return await this.getEarlyTasksCount(userId, preFetchedTasks);

      case 'subtasks_completed':
        return await this.getSubtasksCompletedCount(userId, preFetchedTasks);

      case 'tasks_in_day':
        return await this.getMaxTasksInDay(userId, preFetchedTasks);

      case 'solo_tasks':
        return await this.getSoloTasksCount(userId, preFetchedTasks);

      case 'sunday_tasks':
        return await this.getSundayTasksCount(userId, preFetchedTasks);

      default:
        return 0;
    }
  }

  // Métodos auxiliares para calcular progreso de cada tipo de logro

  async getCompletedTasksCount(userId, tasks = null) {
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const completedCount = tasks.filter(task => task.completed === true).length;
    // console.log(`✅ Completed tasks: ${completedCount}`);
    return completedCount;
  }

  async getHighPriorityTasksCount(userId) {
    // Obtener tareas con información de prioridad
    const { data, error } = await this.client
      .from('tasks')
      .select(`
        id,
        priority_id,
        priorities!inner(name)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error getting high priority tasks:', error);
      return 0;
    }

    // Contar tareas con prioridad "Alta"
    const highPriorityCount = data.filter(task =>
      task.priorities?.name === 'Alta'
    ).length;

    // console.log(`🔴 High priority tasks: ${highPriorityCount}`);
    return highPriorityCount;
  }

  async getSubtasksCreatedCount(userId, tasks = null) {
    // Obtener todas las tareas del usuario
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const taskIds = tasks.map(task => task.id);

    if (taskIds.length === 0) return 0;

    // Contar subtareas de esas tareas
    const { data, error } = await this.client
      .from('subTask')
      .select('id_SubTask', { count: 'exact' })
      .in('id_Task', taskIds);

    if (error) {
      console.error('Error counting subtasks created:', error);
      return 0;
    }

    return data.length;
  }

  async getTasksCreatedCount(userId, tasks = null) {
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    return tasks.length;
  }

  async getCurrentStreak(userId) {
    // console.log(`🔥 Calculating current streak for user ${userId}`);

    // Obtener de la tabla statistics (según el esquema que proporcionaste)
    const { data: statsData, error: statsError } = await this.client
      .from('statistics')
      .select('racha')
      .eq('id_User', userId)
      .maybeSingle();

    if (!statsError && statsData) {
      // console.log(`🔥 Current streak from statistics table: ${statsData.racha}`);
      return statsData.racha || 0;
    }

    // console.log(`🔥 No streak data found in statistics table, returning 0`);
    return 0;
  }

  async getEarlyTasksCount(userId, tasks = null) {
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const earlyTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      const endTime = new Date(task.due_date);
      return endTime.getHours() < 9; // Antes de las 9 AM
    });
    return earlyTasks.length;
  }

  async getSubtasksCompletedCount(userId, tasks = null) {
    // Para el logro "multitarea": verificar si alguna tarea tiene al menos 5 subtareas completadas
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const taskIds = tasks.map(task => task.id);

    if (taskIds.length === 0) return 0;

    // Obtener subtareas completadas agrupadas por tarea padre
    const { data, error } = await this.client
      .from('subTask')
      .select('id_Task')
      .in('id_Task', taskIds)
      .eq('state', true);

    if (error) {
      console.error('Error counting completed subtasks:', error);
      return 0;
    }

    // Contar subtareas por tarea
    const subtasksByTask = {};
    data.forEach(subtask => {
      subtasksByTask[subtask.id_Task] = (subtasksByTask[subtask.id_Task] || 0) + 1;
    });

    // Encontrar el máximo de subtareas completadas en una sola tarea
    const maxCompletedInTask = Math.max(...Object.values(subtasksByTask), 0);
    return maxCompletedInTask;
  }

  async getMaxTasksInDay(userId, tasks = null) {
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const completedTasks = tasks.filter(task => task.completed === true);

    // Agrupar por día
    const tasksByDay = {};
    completedTasks.forEach(task => {
      if (task.updated_at) {
        const date = new Date(task.updated_at).toDateString();
        tasksByDay[date] = (tasksByDay[date] || 0) + 1;
      }
    });

    // Encontrar el máximo
    return Math.max(...Object.values(tasksByDay), 0);
  }

  async getSoloTasksCount(userId, tasks = null) {
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const completedTasks = tasks.filter(task => task.completed === true);

    if (completedTasks.length === 0) return 0;

    const taskIds = completedTasks.map(task => task.id);

    // Obtener todas las subtareas de estas tareas completadas
    const { data, error } = await this.client
      .from('subTask')
      .select('id_Task')
      .in('id_Task', taskIds);

    if (error) {
      console.error('Error counting subtasks for solo tasks:', error);
      return 0;
    }

    // Crear set de taskIds que tienen subtareas
    const tasksWithSubtasks = new Set(data.map(subtask => subtask.id_Task));

    // Contar tareas completadas que NO tienen subtareas
    const soloTasksCount = completedTasks.filter(task => !tasksWithSubtasks.has(task.id)).length;

    return soloTasksCount;
  }

  async getSundayTasksCount(userId, tasks = null) {
    if (!tasks) {
      tasks = await taskRepository.getAllByUserId(userId);
    }
    const sundayTasks = tasks.filter(task => {
      if (!task.due_date) return false;
      const endDate = new Date(task.due_date);
      return endDate.getDay() === 0; // Domingo
    });
    return sundayTasks.length;
  }

  /**
   * Método para ser llamado después de completar una tarea
   * @param {string} userId - ID del usuario
   */
  async onTaskCompleted(userId) {
    console.log(`🎯 TASK COMPLETED - validating achievements for user ${userId}`);

    // Validar logros relacionados con tareas completadas
    const taskRelatedAchievements = [
      'first_task', 'productivo', 'maraton', 'maestro', 'titan', 'dios_productividad',
      'early_tasks', 'tasks_in_day', 'solo_tasks', 'sunday_tasks'
    ];

    console.log(`🔄 Validating ${taskRelatedAchievements.length} completion achievements`);

    for (const achievementId of taskRelatedAchievements) {
      console.log(`🔍 Checking completion achievement: ${achievementId}`);
      await this.validateAchievement(userId, achievementId);
    }

    console.log(`✅ Task completion validation finished`);
  }

  /**
   * Método para ser llamado después de crear una tarea
   * @param {string} userId - ID del usuario
   */
  async onTaskCreated(userId) {
    console.log(`🆕 Task created - validating achievements for user ${userId}`);

    // Validar logros relacionados con creación de tareas
    const creationAchievements = ['explorador', 'prioritario'];

    for (const achievementId of creationAchievements) {
      await this.validateAchievement(userId, achievementId);
    }
  }

  /**
   * Método para ser llamado después de crear una subtarea
   * @param {string} userId - ID del usuario
   */
  async onSubtaskCreated(userId) {
    await this.validateAchievement(userId, 'subdivisor');
  }

  /**
   * Método para ser llamado después de completar una subtarea
   * @param {string} userId - ID del usuario
   */
  async onSubtaskCompleted(userId) {
    await this.validateAchievement(userId, 'multitarea');
  }

  /**
   * Método para ser llamado diariamente para verificar rachas
   * @param {string} userId - ID del usuario
   */
  async onDailyCheck(userId) {
    const streakAchievements = ['consistente', 'leyenda', 'inmortal'];

    for (const achievementId of streakAchievements) {
      await this.validateAchievement(userId, achievementId);
    }
  }

  /**
   * Recalcula y actualiza todos los logros de un usuario
   * @param {string} userId - ID del usuario
   */
  async recalculateAllAchievements(userId) {
    console.log(`🔄 Recalculating ALL achievements for user ${userId}`);

    // Pre-fetch tasks to avoid N+1 queries
    const tasks = await taskRepository.getAllByUserId(userId);
    console.log(`📦 Pre-fetched ${tasks.length} tasks for recalculation`);

    const allAchievements = Object.keys(achievements);
    let updatedCount = 0;

    for (const achievementId of allAchievements) {
      try {
        const wasUpdated = await this.validateAchievement(userId, achievementId, tasks);
        if (wasUpdated) {
          updatedCount++;
          console.log(`✅ Achievement ${achievementId} was updated/unlocked`);
        }
      } catch (error) {
        console.error(`❌ Error recalculating ${achievementId}:`, error);
      }
    }

    console.log(`🎯 Recalculation complete. ${updatedCount} achievements updated for user ${userId}`);
    return updatedCount;
  }
}