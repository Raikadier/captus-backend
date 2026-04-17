// src/controllers/SubTaskController.js
import { SubTaskService } from "../services/SubTaskService.js";
import { AchievementValidatorService } from '../services/AchievementValidatorService.js';

const subTaskService = new SubTaskService();
const achievementValidator = new AchievementValidatorService();

export class SubTaskController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        subTaskService.setCurrentUser(req.user);
        achievementValidator.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getAll(req, res) {
    const result = await subTaskService.getAll();
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await subTaskService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByTask(req, res) {
    const { taskId } = req.params;
    const result = await subTaskService.getByTaskId(parseInt(taskId));
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const result = await subTaskService.create(req.body);

    if (result.success) {
      // Validar logros relacionados con creación de subtareas
      try {
        await achievementValidator.onSubtaskCreated(req.user.id);
      } catch (error) {
        console.error('Error validating achievements on subtask creation:', error);
      }
    }

    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const subTaskData = { ...req.body, id_SubTask: parseInt(id) };
    const result = await subTaskService.update(subTaskData);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await subTaskService.delete(parseInt(id));
    res.status(result.success ? 200 : 400).json(result);
  }

  async complete(req, res) {
    const { id } = req.params;
    const result = await subTaskService.complete(parseInt(id));

    if (result.success) {
      // Validar logros relacionados con completar subtareas
      try {
        await achievementValidator.onSubtaskCompleted(req.user.id);
      } catch (error) {
        console.error('Error validating achievements on subtask completion:', error);
      }
    }

    res.status(result.success ? 200 : 400).json(result);
  }

  async getTaskIdsWithSubTasks(req, res) {
    const result = await subTaskService.getTaskIdsWithSubTasks();
    res.status(result.success ? 200 : 401).json(result);
  }
}