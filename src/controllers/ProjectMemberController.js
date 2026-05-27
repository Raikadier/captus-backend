import { ProjectMemberService } from "../services/ProjectMemberService.js";

export class ProjectMemberController {
  constructor() {
    this.projectMemberService = new ProjectMemberService();
  }

  async getByProject(req, res) {
    const { projectId } = req.params;
    const result = await this.projectMemberService.getByProject(parseInt(projectId), req.user.id);
    res.status(result.success ? 200 : 403).json(result);
  }

  async addMember(req, res) {
    const { projectId } = req.params;
    const result = await this.projectMemberService.addMember(parseInt(projectId), req.body, req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }

  async updateMemberRole(req, res) {
    const { projectId, userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, message: "ID de rol requerido." });
    }

    const result = await this.projectMemberService.updateMemberRole(
      parseInt(projectId), parseInt(userId), roleId, req.user.id
    );
    res.status(result.success ? 200 : 400).json(result);
  }

  async removeMember(req, res) {
    const { projectId, userId } = req.params;
    const result = await this.projectMemberService.removeMember(
      parseInt(projectId), parseInt(userId), req.user.id
    );
    res.status(result.success ? 200 : 400).json(result);
  }

  async getUserRole(req, res) {
    const { projectId, userId } = req.params;
    const result = await this.projectMemberService.getUserRole(parseInt(projectId), parseInt(userId));
    res.status(result.success ? 200 : 404).json(result);
  }

  async isMember(req, res) {
    const { projectId, userId } = req.params;
    const result = await this.projectMemberService.isMember(parseInt(projectId), parseInt(userId));
    res.status(result.success ? 200 : 400).json(result);
  }
}
