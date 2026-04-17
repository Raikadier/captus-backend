import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import ProjectRepository from "../repositories/ProjectRepository.js";
import RolRepository from "../repositories/RolRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const projectMemberRepository = new ProjectMemberRepository();
const projectRepository = new ProjectRepository();
const rolRepository = new RolRepository();

export class ProjectMemberService {
  constructor() {
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

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

  // Verificar si usuario puede gestionar miembros de un proyecto
  async canManageMembers(projectId, userId = null) {
    const userToCheck = userId || this.currentUser?.id;
    if (!userToCheck || !projectId) return false;

    return await projectMemberRepository.isMember(projectId, userToCheck);
  }

  // Verificar si usuario es admin de un proyecto
  async isProjectAdmin(projectId, userId = null) {
    const userToCheck = userId || this.currentUser?.id;
    if (!userToCheck || !projectId) return false;

    const role = await projectMemberRepository.getUserRole(projectId, userToCheck);
    return role && (role.name === "Administrador" || role.name === "Admin");
  }

  // Obtener miembros de un proyecto
  async getByProject(projectId) {
    try {
      if (!projectId || projectId <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      // Verificar que el usuario tenga acceso al proyecto
      const hasAccess = await this.canManageMembers(projectId);
      if (!hasAccess) {
        return new OperationResult(false, "No tienes acceso a este proyecto.");
      }

      const members = await projectMemberRepository.getByProject(projectId);
      return new OperationResult(true, "Miembros obtenidos exitosamente.", members);
    } catch (error) {
      return new OperationResult(false, `Error al obtener miembros: ${error.message}`);
    }
  }

  // Agregar miembro a un proyecto (solo admins)
  async addMember(projectId, memberData) {
    try {
      if (!projectId || projectId <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      // Verificar permisos de admin
      const isAdmin = await this.isProjectAdmin(projectId);
      if (!isAdmin) {
        return new OperationResult(false, "Solo administradores pueden agregar miembros.");
      }

      const { userId, roleId } = memberData;
      if (!userId || !roleId) {
        return new OperationResult(false, "ID de usuario y rol requeridos.");
      }

      // Verificar que el proyecto existe
      const project = await projectRepository.getById(projectId);
      if (!project) {
        return new OperationResult(false, "Proyecto no encontrado.");
      }

      // Verificar que el rol existe
      const role = await rolRepository.getById(roleId);
      if (!role) {
        return new OperationResult(false, "Rol no encontrado.");
      }

      // Verificar que no sea ya miembro
      const isAlreadyMember = await projectMemberRepository.isMember(projectId, userId);
      if (isAlreadyMember) {
        return new OperationResult(false, "El usuario ya es miembro de este proyecto.");
      }

      const member = await projectMemberRepository.save({
        id_User: userId,
        id_Project: projectId,
        id_Rol: roleId
      });

      if (member) {
        return new OperationResult(true, "Miembro agregado exitosamente.", member);
      } else {
        return new OperationResult(false, "Error al agregar miembro.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al agregar miembro: ${error.message}`);
    }
  }

  // Cambiar rol de un miembro (solo admins)
  async updateMemberRole(projectId, userId, newRoleId) {
    try {
      if (!projectId || !userId || !newRoleId) {
        return new OperationResult(false, "Parámetros inválidos.");
      }

      // Verificar permisos de admin
      const isAdmin = await this.isProjectAdmin(projectId);
      if (!isAdmin) {
        return new OperationResult(false, "Solo administradores pueden cambiar roles.");
      }

      // Verificar que el rol existe
      const role = await rolRepository.getById(newRoleId);
      if (!role) {
        return new OperationResult(false, "Rol no encontrado.");
      }

      // No permitir cambiar rol del creador del proyecto
      const project = await projectRepository.getById(projectId);
      if (project && project.id_Creator === userId) {
        return new OperationResult(false, "No se puede cambiar el rol del creador del proyecto.");
      }

      const updated = await projectMemberRepository.updateRole(projectId, userId, newRoleId);
      if (updated) {
        return new OperationResult(true, "Rol actualizado exitosamente.");
      } else {
        return new OperationResult(false, "Error al actualizar rol.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar rol: ${error.message}`);
    }
  }

  // Remover miembro de un proyecto (solo admins)
  async removeMember(projectId, userId) {
    try {
      if (!projectId || !userId) {
        return new OperationResult(false, "Parámetros inválidos.");
      }

      // Verificar permisos de admin
      const isAdmin = await this.isProjectAdmin(projectId);
      if (!isAdmin) {
        return new OperationResult(false, "Solo administradores pueden remover miembros.");
      }

      // No permitir remover al creador del proyecto
      const project = await projectRepository.getById(projectId);
      if (project && project.id_Creator === userId) {
        return new OperationResult(false, "No se puede remover al creador del proyecto.");
      }

      // Verificar que sea miembro
      const isMember = await projectMemberRepository.isMember(projectId, userId);
      if (!isMember) {
        return new OperationResult(false, "El usuario no es miembro de este proyecto.");
      }

      const removed = await projectMemberRepository.removeMember(projectId, userId);
      if (removed) {
        return new OperationResult(true, "Miembro removido exitosamente.");
      } else {
        return new OperationResult(false, "Error al remover miembro.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al remover miembro: ${error.message}`);
    }
  }

  // Obtener rol de un usuario en un proyecto
  async getUserRole(projectId, userId) {
    try {
      if (!projectId || !userId) {
        return new OperationResult(false, "Parámetros inválidos.");
      }

      const role = await projectMemberRepository.getUserRole(projectId, userId);
      if (role) {
        return new OperationResult(true, "Rol obtenido exitosamente.", role);
      } else {
        return new OperationResult(false, "Usuario no encontrado en el proyecto.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al obtener rol: ${error.message}`);
    }
  }

  // Verificar membresía
  async isMember(projectId, userId) {
    try {
      const isMember = await projectMemberRepository.isMember(projectId, userId);
      return new OperationResult(true, "Verificación completada.", { isMember });
    } catch (error) {
      return new OperationResult(false, `Error al verificar membresía: ${error.message}`);
    }
  }
}
