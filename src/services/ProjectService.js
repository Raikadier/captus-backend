import ProjectRepository from "../repositories/ProjectRepository.js";
import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const projectRepository = new ProjectRepository();
const projectMemberRepository = new ProjectMemberRepository();

export class ProjectService {
  constructor() {
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  // Verificar si usuario es miembro de un proyecto
  async isProjectMember(projectId, userId = null) {
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

  // Obtener proyectos donde el usuario es miembro
  async getMyProjects() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      const projects = await projectRepository.getByCreator(this.currentUser.id);
      return new OperationResult(true, "Proyectos obtenidos exitosamente.", projects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyectos: ${error.message}`);
    }
  }

  // Obtener proyectos donde el usuario es miembro (como miembro)
  async getProjectsAsMember() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      const memberships = await projectMemberRepository.getByUser(this.currentUser.id);
      const projects = memberships.map(membership => membership.Project).filter(Boolean);
      return new OperationResult(true, "Proyectos obtenidos exitosamente.", projects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyectos: ${error.message}`);
    }
  }

  // Obtener todos los proyectos del usuario (creados + miembro)
  async getAllUserProjects() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      const [createdProjects, memberProjects] = await Promise.all([
        this.getMyProjects(),
        this.getProjectsAsMember()
      ]);

      if (!createdProjects.success || !memberProjects.success) {
        return new OperationResult(false, "Error al obtener proyectos.");
      }

      // Combinar y eliminar duplicados
      const allProjects = [...createdProjects.data];
      const createdIds = new Set(createdProjects.data.map(p => p.id_Project));

      memberProjects.data.forEach(project => {
        if (!createdIds.has(project.id_Project)) {
          allProjects.push(project);
        }
      });

      return new OperationResult(true, "Proyectos obtenidos exitosamente.", allProjects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyectos: ${error.message}`);
    }
  }

  // Obtener proyecto por ID (con verificación de membresía)
  async getById(id) {
    try {
      if (!id || id <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      const project = await projectRepository.getById(id);
      if (!project) {
        return new OperationResult(false, "Proyecto no encontrado.");
      }

      // Verificar si el usuario es miembro
      const isMember = await this.isProjectMember(id);
      if (!isMember) {
        return new OperationResult(false, "No tienes acceso a este proyecto.");
      }

      return new OperationResult(true, "Proyecto encontrado.", project);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyecto: ${error.message}`);
    }
  }

  // Crear nuevo proyecto
  async create(projectData) {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      if (!projectData.name || projectData.name.trim() === "") {
        return new OperationResult(false, "El nombre del proyecto es requerido.");
      }

      // Verificar nombre único
      const existingProject = await projectRepository.getByName(projectData.name);
      if (existingProject) {
        return new OperationResult(false, "Ya existe un proyecto con ese nombre.");
      }

      const project = await projectRepository.save({
        name: projectData.name,
        description: projectData.description || "",
        id_Creator: this.currentUser.id
      });

      if (project) {
        return new OperationResult(true, "Proyecto creado exitosamente.", project);
      } else {
        return new OperationResult(false, "Error al crear el proyecto.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al crear proyecto: ${error.message}`);
    }
  }

  // Actualizar proyecto (solo creadores)
  async update(id, projectData) {
    try {
      if (!id || id <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      // Verificar permisos
      const isAdmin = await this.isProjectAdmin(id);
      if (!isAdmin) {
        return new OperationResult(false, "No tienes permisos para editar este proyecto.");
      }

      if (!projectData.name || projectData.name.trim() === "") {
        return new OperationResult(false, "El nombre del proyecto es requerido.");
      }

      const updated = await projectRepository.update({
        id_Project: id,
        name: projectData.name,
        description: projectData.description || ""
      });

      if (updated) {
        return new OperationResult(true, "Proyecto actualizado exitosamente.");
      } else {
        return new OperationResult(false, "Error al actualizar el proyecto.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar proyecto: ${error.message}`);
    }
  }

  // Eliminar proyecto (solo creadores)
  async delete(id) {
    try {
      if (!id || id <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      // Verificar permisos
      const isAdmin = await this.isProjectAdmin(id);
      if (!isAdmin) {
        return new OperationResult(false, "No tienes permisos para eliminar este proyecto.");
      }

      // NOTA: Las tareas del proyecto se convierten en personales de sus creadores
      // Esto se maneja en el frontend o en un servicio separado

      const deleted = await projectRepository.delete(id);
      if (deleted) {
        return new OperationResult(true, "Proyecto eliminado exitosamente.");
      } else {
        return new OperationResult(false, "Error al eliminar el proyecto.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al eliminar proyecto: ${error.message}`);
    }
  }
}
