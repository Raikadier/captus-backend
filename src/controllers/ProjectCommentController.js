import { ProjectCommentService } from "../services/ProjectCommentService.js";

export class ProjectCommentController {
  constructor() {
    this.projectCommentService = new ProjectCommentService();
  }

  async getByProject(req, res) {
    const { projectId } = req.params;
    const result = await this.projectCommentService.getByProject(parseInt(projectId), req.user.id);
    res.status(result.success ? 200 : 403).json(result);
  }

  async getById(req, res) {
    const { commentId } = req.params;
    const result = await this.projectCommentService.getById(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  }

  async create(req, res) {
    const { projectId } = req.params;
    const result = await this.projectCommentService.create(parseInt(projectId), req.body, req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }

  async update(req, res) {
    const { commentId } = req.params;
    const result = await this.projectCommentService.update(parseInt(commentId), req.body, req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { commentId } = req.params;
    const result = await this.projectCommentService.delete(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async getReplies(req, res) {
    const { commentId } = req.params;
    const result = await this.projectCommentService.getReplies(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 403).json(result);
  }
}
