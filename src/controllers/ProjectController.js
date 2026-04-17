import { ProjectService } from "../services/ProjectService.js";

const projectService = new ProjectService();

export class ProjectController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        projectService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getAll(req, res) {
    const result = await projectService.getAllUserProjects();
    res.status(result.success ? 200 : 401).json(result);
  }

  async getCreated(req, res) {
    const result = await projectService.getMyProjects();
    res.status(result.success ? 200 : 401).json(result);
  }

  async getAsMember(req, res) {
    const result = await projectService.getProjectsAsMember();
    res.status(result.success ? 200 : 401).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await projectService.getById(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const result = await projectService.create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const result = await projectService.update(parseInt(id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await projectService.delete(parseInt(id));
    res.status(result.success ? 200 : 400).json(result);
  }
}