import { ProjectCommentService } from "../services/ProjectCommentService.js";

const projectCommentService = new ProjectCommentService();

export class ProjectCommentController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        projectCommentService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getByProject(req, res) {
    const { projectId } = req.params;
    const result = await projectCommentService.getByProject(parseInt(projectId));
    res.status(result.success ? 200 : 403).json(result);
  }

  async getById(req, res) {
    const { commentId } = req.params;
    const result = await projectCommentService.getById(parseInt(commentId));
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const { projectId } = req.params;
    const result = await projectCommentService.create(parseInt(projectId), req.body);
    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { commentId } = req.params;
    const result = await projectCommentService.update(parseInt(commentId), req.body);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { commentId } = req.params;
    const result = await projectCommentService.delete(parseInt(commentId));
    res.status(result.success ? 200 : 400).json(result);
  }

  async getReplies(req, res) {
    const { commentId } = req.params;
    const result = await projectCommentService.getReplies(parseInt(commentId));
    res.status(result.success ? 200 : 403).json(result);
  }
}