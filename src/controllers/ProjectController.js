import { ProjectService } from "../services/ProjectService.js";

export class ProjectController {
  constructor() {
    this.projectService = new ProjectService();
  }

  async getAll(req, res) {
    const result = await this.projectService.getAllUserProjects(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getCreated(req, res) {
    const result = await this.projectService.getMyProjects(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getAsMember(req, res) {
    const result = await this.projectService.getProjectsAsMember(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await this.projectService.getById(parseInt(id), req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const result = await this.projectService.create(req.body, req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const result = await this.projectService.update(parseInt(id), req.body, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await this.projectService.delete(parseInt(id), req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }
}
