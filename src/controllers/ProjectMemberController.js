import { ProjectMemberService } from "../services/ProjectMemberService.js";

const projectMemberService = new ProjectMemberService();

export class ProjectMemberController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        projectMemberService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getByProject(req, res) {
    const { projectId } = req.params;
    const result = await projectMemberService.getByProject(parseInt(projectId));
    res.status(result.success ? 200 : 403).json(result);
  }

  async addMember(req, res) {
    const { projectId } = req.params;
    const result = await projectMemberService.addMember(parseInt(projectId), req.body);
    res.status(result.success ? 201 : 400).json(result);
  }

  async updateMemberRole(req, res) {
    const { projectId, userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "ID de rol requerido."
      });
    }

    const result = await projectMemberService.updateMemberRole(parseInt(projectId), parseInt(userId), roleId);
    res.status(result.success ? 200 : 400).json(result);
  }

  async removeMember(req, res) {
    const { projectId, userId } = req.params;
    const result = await projectMemberService.removeMember(parseInt(projectId), parseInt(userId));
    res.status(result.success ? 200 : 400).json(result);
  }

  async getUserRole(req, res) {
    const { projectId, userId } = req.params;
    const result = await projectMemberService.getUserRole(parseInt(projectId), parseInt(userId));
    res.status(result.success ? 200 : 404).json(result);
  }

  async isMember(req, res) {
    const { projectId, userId } = req.params;
    const result = await projectMemberService.isMember(parseInt(projectId), parseInt(userId));
    res.status(result.success ? 200 : 400).json(result);
  }
}