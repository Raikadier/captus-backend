import { TaskService } from "../services/TaskService.js";
import NotificationService from '../services/NotificationService.js';
import { AchievementValidatorService } from '../services/AchievementValidatorService.js';
import TaskRepository from "../repositories/TaskRepository.js";
import SubTaskRepository from "../repositories/SubTaskRepository.js";
import PriorityRepository from "../repositories/PriorityRepository.js";
import CategoryRepository from "../repositories/CategoryRepository.js";
import StatisticsRepository from "../repositories/StatisticsRepository.js";

export class TaskController {
  constructor() {
    // Manual Dependency Injection
    const taskRepo = new TaskRepository();
    const subTaskRepo = new SubTaskRepository();
    const priorityRepo = new PriorityRepository();
    const categoryRepo = new CategoryRepository();
    const statisticsRepo = new StatisticsRepository();

    this.taskService = new TaskService(
      taskRepo,
      subTaskRepo,
      priorityRepo,
      categoryRepo,
      statisticsRepo
    );
    this.achievementValidator = new AchievementValidatorService();

    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        this.taskService.setCurrentUser(req.user);
        this.achievementValidator.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getAll(req, res) {
    const { projectId } = req.query;
    // Create filter if projectId is present
    const filter = projectId ? (task) => task.project_id === parseInt(projectId) : null;

    // Use getTasksByUser directly for filtering support
    const result = await this.taskService.getTasksByUser(req.user, filter);

    // Wrap in OperationResult format to match expected output
    res.status(200).json({
      success: true,
      message: "Tareas obtenidas exitosamente.",
      data: result
    });
  }

  async getById(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = req.params;
    const result = await this.taskService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByUser(req, res) {
    const result = await this.taskService.getByUser();
    res.status(result.success ? 200 : 401).json(result);
  }

  async create(req, res) {
    const result = await this.taskService.save(req.body, req.user);

    if (result.success) {
      // Auto-notification
      await NotificationService.notify({
        user_id: req.user.id,
        title: 'Tarea Creada',
        body: `Has creado la tarea: "${result.data.title}"`,
        event_type: 'task_created',
        entity_id: result.data.id || result.data.id_Task,
        is_auto: true
      });

      // Validar logros relacionados con creación de tareas
      try {
        await this.achievementValidator.onTaskCreated(req.user.id);
      } catch (error) {
        console.error('Error validating achievements on task creation:', error);
      }
    }

    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = req.params;
    const taskData = { ...req.body, id_Task: parseInt(id) };
    const result = await this.taskService.update(taskData);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = req.params;
    const result = await this.taskService.delete(parseInt(id));
    res.status(result.success ? 200 : 400).json(result);
  }

  async complete(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = req.params;
    const result = await this.taskService.complete(parseInt(id));

    if (result.success) {
      // Validar logros relacionados con completar tareas
      try {
        await this.achievementValidator.onTaskCompleted(req.user.id);
      } catch (error) {
        console.error('Error validating achievements on task completion:', error);
      }
    }

    res.status(result.success ? 200 : 400).json(result);
  }

  async deleteByCategory(req, res) {
    // Warning: DeleteByCategory needs safety checks!
    const { categoryId } = req.params;
    const result = await this.taskService.deleteByCategory(parseInt(categoryId));
    res.status(result.success ? 200 : 400).json(result);
  }

  async getPending(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const limit = parseInt(req.query.limit) || 3;
    const result = await this.taskService.getPendingTasks(limit);
    res.status(result.success ? 200 : 400).json(result);
  }
}
