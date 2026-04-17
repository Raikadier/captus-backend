import TaskRepository from "../repositories/TaskRepository.js";
import SubTaskRepository from "../repositories/SubTaskRepository.js";
import PriorityRepository from "../repositories/PriorityRepository.js";
import CategoryRepository from "../repositories/CategoryRepository.js";
import StatisticsRepository from "../repositories/StatisticsRepository.js";
import { OperationResult } from "../shared/OperationResult.js";
import { validateRequired, validateFutureDate } from "../shared/validators.js";
import nodemailer from 'nodemailer';

/**
 * Service for Task management.
 * Follows a stateless pattern where each method receives the userId for validation.
 * Standardized to use 'completed' and 'user_id' per SQL schema.
 */
export class TaskService {
  constructor(
    taskRepo,
    subTaskRepo,
    priorityRepo,
    categoryRepo,
    statisticsRepo
  ) {
    this.taskRepository = taskRepo || new TaskRepository();
    this.subTaskRepository = subTaskRepo || new SubTaskRepository();
    this.priorityRepository = priorityRepo || new PriorityRepository();
    this.categoryRepository = categoryRepo || new CategoryRepository();
    this.statisticsRepository = statisticsRepo || new StatisticsRepository();
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  resolveUserId(user) {
    if (!user) return this.currentUser?.id || this.currentUser?.user_id || null;
    if (typeof user === "string") return user;
    return user.id || user.user_id || null;
  }

  validateTask(task, isUpdate = false) {
    if (!task) {
      return new OperationResult(false, "La tarea no puede ser nula.");
    }

    // For updates, only validate fields that are being updated
    if (!isUpdate) {
      const titleError = validateRequired(task.title, 'título');
      if (titleError) return new OperationResult(false, titleError);

      if (!task.user_id && !task.id_User) {
        return new OperationResult(false, "La tarea debe tener un usuario asignado.");
      }
      if (!task.due_date && !task.endDate) {
        return new OperationResult(false, "La tarea debe tener una fecha límite (due_date).");
      }
    } else {
      if (!task.user_id && !task.id_User && !task.id_Task) {
        return new OperationResult(false, "La tarea debe tener un usuario asignado.");
      }
    }

    // Validate due date is not in the past
    const dateError = validateFutureDate(task.due_date, 'fecha límite');
    if (dateError) return new OperationResult(false, dateError);

    return new OperationResult(true);
  }

  async save(task, userContext = null) {
    try {
      const userId = this.resolveUserId(userContext);
      if (!userId) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      const taskWithUser = { ...task, user_id: task.user_id || task.id_User || userId };

      const validation = this.validateTask(taskWithUser);
      if (!validation.success) return validation;

      if (!task.creationDate) {
        task.creationDate = new Date();
      }

      const savedTask = await this.taskRepository.save(taskWithUser);
      if (!savedTask) {
        return new OperationResult(false, "Error al guardar la tarea.");
      }

      // Load relations for email notification
      await this.loadTaskRelations(savedTask);

      // Async notification
      this.sendTaskNotification(savedTask, 'created').catch(error => {
        console.error('Error enviando notificación de creación de tarea:', error);
      });

      return new OperationResult(true, `Tarea "${savedTask.title}" creada exitosamente.`, savedTask);
    } catch (error) {
      return new OperationResult(false, `Error al guardar la tarea: ${error.message}`);
    }
  }

  validateTaskId(id) {
    if (!id) {
      return new OperationResult(false, "ID de tarea inválido.");
    }
    return new OperationResult(true);
  }

  /**
   * Deletes a task and all its subtasks.
   * @param {number} taskId
   * @param {string} userId
   * @returns {Promise<OperationResult>}
   */
  async delete(taskId, userId) {
    try {
      if (!taskId) {
        return new OperationResult(false, "ID de tarea inválido.");
      }

      const existingTask = await this.taskRepository.getById(taskId);
      if (!existingTask) {
        return new OperationResult(false, "Tarea no encontrada.");
      }

      const resolvedUserId = this.resolveUserId(userId);
      const taskOwner = existingTask.user_id || existingTask.id_User;
      if (resolvedUserId && taskOwner !== resolvedUserId) {
        return new OperationResult(false, "No tienes permiso para eliminar esta tarea.");
      }

      // Delete all subtasks first
      try {
        const subTasks = await this.subTaskRepository.getAllByTaskId(taskId);
        for (const subTask of subTasks) {
          await this.subTaskRepository.delete(subTask.id_SubTask || subTask.id);
        }
      } catch (error) {
        console.error("Error eliminando subtareas:", error);
      }

      await this.taskRepository.delete(taskId);
      return new OperationResult(true, "Tarea eliminada exitosamente.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar la tarea: ${error.message}`);
    }
  }

  async deleteByUser(userId) {
    try {
      if (!userId) {
        return new OperationResult(false, "ID de usuario inválido.");
      }

      await this.taskRepository.deleteByUser(userId);
      return new OperationResult(true, "Tareas del usuario eliminadas exitosamente.");
    } catch (error) {
      console.error(`Error inesperado en TaskService.delete: ${error.message}`);
      throw new Error("Ocurrió un error inesperado al eliminar la tarea.");
    }
  }

  async deleteByCategory(categoryId) {
    try {
      if (!categoryId) {
        return new OperationResult(false, "ID de categoría inválido.");
      }

      await this.taskRepository.deleteByCategory(categoryId);
      return new OperationResult(true, "Tareas de la categoría eliminadas exitosamente.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar tareas de la categoría: ${error.message}`);
    }
  }

  async getTasksByUser(userContext = null, filter = null, limit = null) {
    try {
      const userId = this.resolveUserId(userContext);
      if (!userId) return [];

      let tasks = await this.taskRepository.getAllByUserId(userId);

      if (filter) {
        tasks = tasks.filter(filter);
      }

      if (limit && limit > 0) {
        tasks = tasks.slice(0, limit);
      }

      return tasks;
    } catch (error) {
      console.error(`Error inesperado en TaskService.getById: ${error.message}`);
      throw new Error("Ocurrió un error inesperado al obtener la tarea.");
    }
  }

  async getAll(userContext = null) {
    try {
      const tasks = await this.getTasksByUser(userContext);

      // Load relations in parallel for better performance
      const relationPromises = tasks.map(task => this.loadTaskRelations(task));
      await Promise.all(relationPromises);
      return new OperationResult(true, "Tareas obtenidas exitosamente.", tasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas: ${error.message}`);
    }
  }

  async getPendingTasks(limit = 3, userContext = null) {
    try {
      const userId = this.resolveUserId(userContext);
      if (!userId) return new OperationResult(false, "Usuario no autenticado");

      // Get only incomplete tasks efficiently with limit
      const tasks = await this.getTasksByUser({ id: userId }, (task) => !task.state, limit);

      // Load relations in parallel for better performance
      const relationPromises = tasks.map(task => this.loadTaskRelations(task));
      await Promise.all(relationPromises);

      return new OperationResult(true, "Tareas pendientes obtenidas exitosamente.", tasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas pendientes: ${error.message}`);
    }
  }

  async getIncompleteByUser(userContext = null) {
    try {
      const tasks = await this.getTasksByUser(userContext, (task) => !task.state);
      return new OperationResult(true, "Tareas incompletas obtenidas exitosamente.", tasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas incompletas: ${error.message}`);
    }
  }

  async getCompletedByUser(userContext = null) {
    try {
      const tasks = await this.getTasksByUser(userContext, (task) => task.state);
      return new OperationResult(true, "Tareas completadas obtenidas exitosamente.", tasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas completadas: ${error.message}`);
    }
  }

  async getCompletedTodayByUser(userContext = null) {
    try {
      const userId = this.resolveUserId(userContext);
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const tasks = await this.taskRepository.getCompletedToday(userId);
      return new OperationResult(true, "Tareas completadas hoy obtenidas exitosamente.", tasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas completadas hoy: ${error.message}`);
    }
  }

  async getTasksForAi(options = {}, userContext = null) {
    try {
      const userId = this.resolveUserId(userContext);
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const includeCompleted = Boolean(options.includeCompleted);
      const limit = options.limit || 10;

      const tasks = await this.taskRepository.getAllByUserId(userId);
      const filtered = includeCompleted ? tasks : tasks.filter((task) => !task.state && !task.completed);

      // Order by due_date ascending when present
      filtered.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      return new OperationResult(true, "Tareas obtenidas exitosamente.", filtered.slice(0, limit));
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas: ${error.message}`);
    }
  }

  async getById(id, userContext = null) {
    try {
      const validation = this.validateTaskId(id);
      if (!validation.success) return validation;

      const task = await this.taskRepository.getById(id);
      const userId = this.resolveUserId(userContext);
      if (task && userId && task.id_User === userId) {
        return new OperationResult(true, "Tarea encontrada.", task);
      }

      return new OperationResult(false, "Tarea no encontrada.");
    } catch (error) {
      return new OperationResult(false, `Error al obtener tarea: ${error.message}`);
    }
  }

  async update(task, userContext = null) {
    try {
      // Map completed to state if present
      if (task.completed !== undefined) {
        task.state = task.completed;
      }

      const validation = this.validateTask(task, true); // isUpdate = true
      if (!validation.success) return validation;

      const existingTask = await this.taskRepository.getById(task.id_Task);
      if (!existingTask) {
        return new OperationResult(false, "Tarea no encontrada.");
      }

      const userId = this.resolveUserId(userContext);
      if (!userId || existingTask.id_User !== userId) {
        return new OperationResult(false, "No tienes acceso a esta tarea.");
      }

      if (!task.state && existingTask.state) {
        return new OperationResult(false, "No se puede desmarcar una tarea completada.");
      }

      // If completing the task, mark all subtasks as completed
      if (task.state && !existingTask.state) {
        await this.markAllSubTasksAsCompleted(task.id_Task);
      }

      const updated = await this.taskRepository.update(task);

      if (updated) {
        // Load relations for email notification
        await this.loadTaskRelations(updated);

        // Send notification email (non-blocking)
        this.sendTaskNotification(updated, 'updated').catch(error => {
          console.error('Error sending task update notification:', error);
        });

        return new OperationResult(true, "Tarea actualizada exitosamente.", updated);
      } else {
        return new OperationResult(false, "Error al actualizar la tarea.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar tarea: ${error.message}`);
    }
  }

  async markAllSubTasksAsCompleted(taskId) {
    try {
      const subTasks = await this.subTaskRepository.getAllByTaskId(taskId);
      for (const subTask of subTasks) {
        if (!subTask.state) {
          subTask.state = true;
          await this.subTaskRepository.update(subTask);
        }
      }
    } catch (error) {
      console.error("Error marcando subtareas como completadas:", error);
    }
  }

  async getOverdueTasks(userContext = null) {
    try {
      const userId = this.resolveUserId(userContext);
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const tasks = await this.taskRepository.getOverdueByUser(userId);
      return new OperationResult(true, "Tareas vencidas obtenidas exitosamente.", tasks);
    } catch (error) {
      return new OperationResult(false, `Error al obtener tareas vencidas: ${error.message}`);
    }
  }

  async updateTaskState(taskId, state, userContext = null) {
    try {
      const validation = this.validateTaskId(taskId);
      if (!validation.success) return validation;

      const userId = this.resolveUserId(userContext);
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const task = await this.taskRepository.getById(taskId);
      if (!task || task.id_User !== userId) {
        return new OperationResult(false, "Tarea no encontrada.");
      }

      // Check if task is overdue
      if (state && task.endDate) {
        const now = new Date();
        const dueDate = new Date(task.endDate);
        if (dueDate < now) {
          return new OperationResult(false, "No se puede completar una tarea que ha pasado su fecha límite.");
        }
      }

      // Check if any subtasks are overdue (if trying to complete parent task)
      if (state) {
        const subTasks = await this.subTaskRepository.getAllByTaskId(taskId);
        const hasOverdueSubTasks = subTasks.some(subTask => {
          if (subTask.endDate) {
            const now = new Date();
            const subTaskDueDate = new Date(subTask.endDate);
            return subTaskDueDate < now;
          }
          return false;
        });

        if (hasOverdueSubTasks) {
          return new OperationResult(false, "No se puede completar una tarea que tiene subtareas vencidas.");
        }

        // Mark all subtasks as completed when completing parent task
        await this.markAllSubTasksAsCompleted(taskId);
      }

      task.state = state;
      const result = await this.update(task, { id: userId });

      if (state) {
        await this.updateStatisticsOnCompletion(task.id_User);

        // Send completion notification email (non-blocking)
        await this.loadTaskRelations(task);
        this.sendTaskNotification(task, 'completed').catch(error => {
          console.error('Error sending task completion notification:', error);
        });
      }

      return result;
    } catch (error) {
      return new OperationResult(false, `Error al actualizar estado de tarea: ${error.message}`);
    }
  }

  async updateStatisticsOnCompletion(userId) {
    try {
      const { StatisticsService } = await import('./StatisticsService.js');
      const statsService = new StatisticsService();
      statsService.setCurrentUser({ id: userId });
      await statsService.updateFavoriteCategory();
    } catch (error) {
      console.error("Error actualizando categoría favorita:", error);
    }
  }

  async updateStreakOnCompletion(userId) {
    try {
      // Import StatisticsService dynamically to avoid circular dependency
      const { StatisticsService } = await import('./StatisticsService.js');
      const statsService = new StatisticsService();
      statsService.setCurrentUser({ id: userId });
      await statsService.checkStreak();
    } catch (error) {
      console.error("Error actualizando racha:", error);
    }
  }

  async create(task) {
    return this.save(task);
  }

  async complete(id, userContext = null) {
    return this.updateTaskState(id, true, userContext);
  }

  async createAndSaveTask(title, description, endDate, priorityText, categoryText, userId) {
    try {
      const titleError = validateRequired(title, 'título');
      if (titleError) return new OperationResult(false, titleError);

      if (!userId) {
        return new OperationResult(false, "El usuario es requerido.");
      }

      const { priorityId, categoryId } = await this.getPriorityAndCategoryIds(priorityText, categoryText, userId);

      const newTask = {
        title,
        description: description || null,
        creationDate: new Date(),
        endDate,
        id_Priority: priorityId,
        id_Category: categoryId,
        state: false,
        id_User: userId,
      };

      const savedTask = await this.save(newTask, { id: userId });
      if (savedTask.success) {
        await this.loadTaskRelations(savedTask.data);
      }

      return savedTask;
    } catch (error) {
      return new OperationResult(false, `Error al crear la tarea: ${error.message}`);
    }
  }

  async getPriorityAndCategoryIds(priorityText, categoryText, userId) {
    let priorityId = null;
    let categoryId = null;

    try {
      if (priorityText) {
        const priorities = await this.priorityRepository.getAll();
        const priority = priorities.find((p) => p.name.toLowerCase() === priorityText.toLowerCase());
        if (priority) {
          priorityId = priority.id_Priority;
        }
      }

      if (categoryText) {
        const categories = await this.categoryRepository.getByUser(userId);
        const category = categories.find((c) => c.name.toLowerCase() === categoryText.toLowerCase());
        if (category) {
          categoryId = category.id_Category;
        }
      }
    } catch (error) {
      console.error("Error obteniendo IDs de prioridad y categoría:", error);
    }

    return { priorityId, categoryId };
  }

  async loadTaskRelations(task) {
    try {
      // Map IDs if using snake_case properties
      const categoryId = task.category_id || task.id_Category;
      const priorityId = task.priority_id || task.id_Priority;

      if (categoryId) {
        try {
          task.Category = await this.categoryRepository.getById(categoryId);
        } catch (error) {
          task.Category = null;
        }
      }

      if (priorityId) {
        try {
          task.Priority = await this.priorityRepository.getById(priorityId);
        } catch (error) {
          task.Priority = null;
        }
      }
    } catch (error) {
      console.error("Error cargando relaciones de tarea:", error);
    }
  }

  // Email notification methods
  async sendTaskNotification(task, action) {
    try {
      if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
        console.warn('Email notifications are disabled by DISABLE_EMAIL_NOTIFICATIONS');
        return;
      }
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('Gmail credentials not configured for task notifications');
        return;
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const actionText = {
        'created': 'creada',
        'completed': 'completada',
        'updated': 'actualizada'
      }[action] || 'modificada';

      const subject = `Tarea ${actionText}: ${task.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Tarea ${actionText}</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${task.title}</h3>
            ${task.description ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Descripción:</strong> ${task.description}</p>` : ''}
            ${task.endDate ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Fecha límite:</strong> ${new Date(task.endDate).toLocaleDateString('es-ES')}</p>` : ''}
            ${task.Category ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Categoría:</strong> ${task.Category.name}</p>` : ''}
            ${task.Priority ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Prioridad:</strong> ${task.Priority.name}</p>` : ''}
            <p style="margin: 10px 0; color: #16a34a; font-weight: bold;">Estado: ${task.state ? 'Completada ✅' : 'Pendiente ⏳'}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Este es un recordatorio automático de Captus.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: this.currentUser?.email,
        subject,
        html,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`Task notification email sent for ${action} task`);
      }
    } catch (error) {
      if (error?.code === 'EAUTH') {
        console.warn('Gmail authentication failed. Skipping email notification.');
        return;
      }
      console.error('Error sending task notification:', error);
    }
  }
}
