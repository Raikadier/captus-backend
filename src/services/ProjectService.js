import ProjectRepository from "../repositories/ProjectRepository.js";
import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const projectRepository       = new ProjectRepository();
const projectMemberRepository = new ProjectMemberRepository();

export class ProjectService {
  async isProjectMember(projectId, userId) {
    if (!userId || !projectId) return false;
    return await projectMemberRepository.isMember(projectId, userId);
  }

  async isProjectAdmin(projectId, userId) {
    if (!userId || !projectId) return false;
    const role = await projectMemberRepository.getUserRole(projectId, userId);
    return role && (role.name === "Administrador" || role.name === "Admin");
  }

  async getMyProjects(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");
      const projects = await projectRepository.getByCreator(userId);
      return new OperationResult(true, "Proyectos obtenidos exitosamente.", projects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyectos: ${error.message}`);
    }
  }

  async getProjectsAsMember(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");
      const memberships = await projectMemberRepository.getByUser(userId);
      const projects = memberships.map(m => m.Project).filter(Boolean);
      return new OperationResult(true, "Proyectos obtenidos exitosamente.", projects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyectos: ${error.message}`);
    }
  }

  async getAllUserProjects(userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");

      const [createdResult, memberResult] = await Promise.all([
        this.getMyProjects(userId),
        this.getProjectsAsMember(userId),
      ]);

      if (!createdResult.success || !memberResult.success)
        return new OperationResult(false, "Error al obtener proyectos.");

      const allProjects = [...createdResult.data];
      const createdIds  = new Set(createdResult.data.map(p => p.id_Project));
      memberResult.data.forEach(p => {
        if (!createdIds.has(p.id_Project)) allProjects.push(p);
      });

      return new OperationResult(true, "Proyectos obtenidos exitosamente.", allProjects);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyectos: ${error.message}`);
    }
  }

  async getById(id, userId) {
    try {
      if (!id || id <= 0) return new OperationResult(false, "ID de proyecto inválido.");

      const project = await projectRepository.getById(id);
      if (!project)   return new OperationResult(false, "Proyecto no encontrado.");

      const isMember = await this.isProjectMember(id, userId);
      if (!isMember)  return new OperationResult(false, "No tienes acceso a este proyecto.");

      return new OperationResult(true, "Proyecto encontrado.", project);
    } catch (error) {
      return new OperationResult(false, `Error al obtener proyecto: ${error.message}`);
    }
  }

  async create(projectData, userId) {
    try {
      if (!userId) return new OperationResult(false, "Usuario no autenticado.");
      if (!projectData.name || projectData.name.trim() === "")
        return new OperationResult(false, "El nombre del proyecto es requerido.");

      const existing = await projectRepository.getByName(projectData.name);
      if (existing)
        return new OperationResult(false, "Ya existe un proyecto con ese nombre.");

      const project = await projectRepository.save({
        name:        projectData.name,
        description: projectData.description || "",
        id_Creator:  userId,
      });

      return project
        ? new OperationResult(true, "Proyecto creado exitosamente.", project)
        : new OperationResult(false, "Error al crear el proyecto.");
    } catch (error) {
      return new OperationResult(false, `Error al crear proyecto: ${error.message}`);
    }
  }

  async update(id, projectData, userId) {
    try {
      if (!id || id <= 0) return new OperationResult(false, "ID de proyecto inválido.");

      const isAdmin = await this.isProjectAdmin(id, userId);
      if (!isAdmin)  return new OperationResult(false, "No tienes permisos para editar este proyecto.");

      if (!projectData.name || projectData.name.trim() === "")
        return new OperationResult(false, "El nombre del proyecto es requerido.");

      const updated = await projectRepository.update({
        id_Project:  id,
        name:        projectData.name,
        description: projectData.description || "",
      });

      return updated
        ? new OperationResult(true, "Proyecto actualizado exitosamente.")
        : new OperationResult(false, "Error al actualizar el proyecto.");
    } catch (error) {
      return new OperationResult(false, `Error al actualizar proyecto: ${error.message}`);
    }
  }

  async delete(id, userId) {
    try {
      if (!id || id <= 0) return new OperationResult(false, "ID de proyecto inválido.");

      const isAdmin = await this.isProjectAdmin(id, userId);
      if (!isAdmin)  return new OperationResult(false, "No tienes permisos para eliminar este proyecto.");

      const deleted = await projectRepository.delete(id);
      return deleted
        ? new OperationResult(true, "Proyecto eliminado exitosamente.")
        : new OperationResult(false, "Error al eliminar el proyecto.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar proyecto: ${error.message}`);
    }
  }
}
