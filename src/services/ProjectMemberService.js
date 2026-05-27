import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import ProjectRepository from "../repositories/ProjectRepository.js";
import RolRepository from "../repositories/RolRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const projectMemberRepository = new ProjectMemberRepository();
const projectRepository       = new ProjectRepository();
const rolRepository            = new RolRepository();

export class ProjectMemberService {
  async isCreator(projectId, userId) {
    try {
      const project = await projectRepository.getById(projectId);
      return project && project.id_Creator === userId;
    } catch (error) {
      console.error('isCreator error:', error);
      return false;
    }
  }

  async isAdmin(projectId, userId) {
    try {
      const role = await this.getUserRole(projectId, userId);
      return role && (role.name === "Administrador" || role.name === "Admin");
    } catch (error) {
      console.error('isAdmin error:', error);
      return false;
    }
  }

  async canManageMembers(projectId, userId) {
    if (!userId || !projectId) return false;
    return await projectMemberRepository.isMember(projectId, userId);
  }

  async isProjectAdmin(projectId, userId) {
    if (!userId || !projectId) return false;
    const role = await projectMemberRepository.getUserRole(projectId, userId);
    return role && (role.name === "Administrador" || role.name === "Admin");
  }

  async getByProject(projectId, callerId) {
    try {
      if (!projectId || projectId <= 0)
        return new OperationResult(false, "ID de proyecto inválido.");

      const hasAccess = await this.canManageMembers(projectId, callerId);
      if (!hasAccess)
        return new OperationResult(false, "No tienes acceso a este proyecto.");

      const members = await projectMemberRepository.getByProject(projectId);
      return new OperationResult(true, "Miembros obtenidos exitosamente.", members);
    } catch (error) {
      return new OperationResult(false, `Error al obtener miembros: ${error.message}`);
    }
  }

  async addMember(projectId, memberData, callerId) {
    try {
      if (!projectId || projectId <= 0)
        return new OperationResult(false, "ID de proyecto inválido.");

      const isAdmin = await this.isProjectAdmin(projectId, callerId);
      if (!isAdmin)
        return new OperationResult(false, "Solo administradores pueden agregar miembros.");

      const { userId, roleId } = memberData;
      if (!userId || !roleId)
        return new OperationResult(false, "ID de usuario y rol requeridos.");

      const project = await projectRepository.getById(projectId);
      if (!project)
        return new OperationResult(false, "Proyecto no encontrado.");

      const role = await rolRepository.getById(roleId);
      if (!role)
        return new OperationResult(false, "Rol no encontrado.");

      const isAlreadyMember = await projectMemberRepository.isMember(projectId, userId);
      if (isAlreadyMember)
        return new OperationResult(false, "El usuario ya es miembro de este proyecto.");

      const member = await projectMemberRepository.save({
        id_User:    userId,
        id_Project: projectId,
        id_Rol:     roleId,
      });

      return member
        ? new OperationResult(true, "Miembro agregado exitosamente.", member)
        : new OperationResult(false, "Error al agregar miembro.");
    } catch (error) {
      return new OperationResult(false, `Error al agregar miembro: ${error.message}`);
    }
  }

  async updateMemberRole(projectId, userId, newRoleId, callerId) {
    try {
      if (!projectId || !userId || !newRoleId)
        return new OperationResult(false, "Parámetros inválidos.");

      const isAdmin = await this.isProjectAdmin(projectId, callerId);
      if (!isAdmin)
        return new OperationResult(false, "Solo administradores pueden cambiar roles.");

      const role = await rolRepository.getById(newRoleId);
      if (!role)
        return new OperationResult(false, "Rol no encontrado.");

      const project = await projectRepository.getById(projectId);
      if (project && project.id_Creator === userId)
        return new OperationResult(false, "No se puede cambiar el rol del creador del proyecto.");

      const updated = await projectMemberRepository.updateRole(projectId, userId, newRoleId);
      return updated
        ? new OperationResult(true, "Rol actualizado exitosamente.")
        : new OperationResult(false, "Error al actualizar rol.");
    } catch (error) {
      return new OperationResult(false, `Error al actualizar rol: ${error.message}`);
    }
  }

  async removeMember(projectId, userId, callerId) {
    try {
      if (!projectId || !userId)
        return new OperationResult(false, "Parámetros inválidos.");

      const isAdmin = await this.isProjectAdmin(projectId, callerId);
      if (!isAdmin)
        return new OperationResult(false, "Solo administradores pueden remover miembros.");

      const project = await projectRepository.getById(projectId);
      if (project && project.id_Creator === userId)
        return new OperationResult(false, "No se puede remover al creador del proyecto.");

      const isMember = await projectMemberRepository.isMember(projectId, userId);
      if (!isMember)
        return new OperationResult(false, "El usuario no es miembro de este proyecto.");

      const removed = await projectMemberRepository.removeMember(projectId, userId);
      return removed
        ? new OperationResult(true, "Miembro removido exitosamente.")
        : new OperationResult(false, "Error al remover miembro.");
    } catch (error) {
      return new OperationResult(false, `Error al remover miembro: ${error.message}`);
    }
  }

  async getUserRole(projectId, userId) {
    try {
      if (!projectId || !userId)
        return new OperationResult(false, "Parámetros inválidos.");

      const role = await projectMemberRepository.getUserRole(projectId, userId);
      return role
        ? new OperationResult(true, "Rol obtenido exitosamente.", role)
        : new OperationResult(false, "Usuario no encontrado en el proyecto.");
    } catch (error) {
      return new OperationResult(false, `Error al obtener rol: ${error.message}`);
    }
  }

  async isMember(projectId, userId) {
    try {
      const isMember = await projectMemberRepository.isMember(projectId, userId);
      return new OperationResult(true, "Verificación completada.", { isMember });
    } catch (error) {
      return new OperationResult(false, `Error al verificar membresía: ${error.message}`);
    }
  }
}
