// src/controllers/SubTaskController.js
import { SubTaskService } from "../services/SubTaskService.js";
import { AchievementValidatorService } from '../services/AchievementValidatorService.js';

export class SubTaskController {
  constructor() {
    this.subTaskService         = new SubTaskService();
    this.achievementValidator   = new AchievementValidatorService();
  }

  async getAll(req, res) {
    const result = await this.subTaskService.getAll(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await this.subTaskService.getById(parseInt(id), req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  }

  async getByTask(req, res) {
    const { taskId } = req.params;
    const result = await this.subTaskService.getByTaskId(parseInt(taskId), req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const result = await this.subTaskService.create(req.body, req.user.id);

    if (result.success) {
      try {
        await this.achievementValidator.onSubtaskCreated(req.user.id);
      } catch (error) {
        console.error('Error validating achievements on subtask creation:', error);
      }
    }

    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const subTaskData = { ...req.body, id_SubTask: parseInt(id) };
    const result = await this.subTaskService.update(subTaskData, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await this.subTaskService.delete(parseInt(id), req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async complete(req, res) {
    const { id } = req.params;
    const result = await this.subTaskService.complete(parseInt(id), req.user.id);

    if (result.success) {
      try {
        await this.achievementValidator.onSubtaskCompleted(req.user.id);
      } catch (error) {
        console.error('Error validating achievements on subtask completion:', error);
      }
    }

    res.status(result.success ? 200 : 400).json(result);
  }

  async getTaskIdsWithSubTasks(req, res) {
    const result = await this.subTaskService.getTaskIdsWithSubTasks(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }
}
