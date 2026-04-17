import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_ProjectMember: row.id,
  id_User: row.user_id,
  id_Project: row.project_id,
  id_Rol: row.role_id,
});

const mapToDb = (entity) => ({
  user_id: entity.id_User,
  project_id: entity.id_Project,
  role_id: entity.id_Rol,
});

class ProjectMemberRepository extends BaseRepository {
  constructor() {
    super("project_members", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  // Obtener todos los miembros de proyectos
  async getAll() {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*");

      if (error) {
        console.error("Error al obtener miembros de proyectos:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener miembros de proyectos:", error);
      return [];
    }
  }

  // Obtener miembros de un proyecto específico
  async getByProject(projectId) {
    try {
      if (!projectId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("project_id", projectId);

      if (error) {
        console.error("Error al obtener miembros por proyecto:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener miembros por proyecto:", error);
      return [];
    }
  }

  // Obtener proyectos de un usuario (como miembro)
  async getByUser(userId) {
    try {
      if (!userId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error al obtener proyectos por usuario:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener proyectos por usuario:", error);
      return [];
    }
  }

  // Obtener un miembro específico por ID
  async getById(id) {
    try {
      if (!id) return null;
      return super.getById(id);
    } catch (error) {
      console.error("Error al obtener miembro por ID:", error);
      return null;
    }
  }

  // Verificar si un usuario es miembro de un proyecto
  async isMember(projectId, userId) {
    try {
      if (!projectId || !userId) return false;
      const { data, error } = await this.client
        .from(this.tableName)
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error al verificar membresía:", error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error al verificar membresía:", error);
      return false;
    }
  }

  // Obtener el rol de un usuario en un proyecto
  async getUserRole(projectId, userId) {
    try {
      if (!projectId || !userId) return null;
      const { data, error } = await this.client
        .from(this.tableName)
        .select("role_id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error al obtener rol de usuario:", error.message);
        return null;
      }

      return data ? { id_Rol: data.role_id } : null; // Simplified, assuming Rol object
    } catch (error) {
      console.error("Error al obtener rol de usuario:", error);
      return null;
    }
  }

  // Actualizar rol de un miembro
  async updateRole(projectId, userId, roleId) {
    try {
      if (!projectId || !userId || !roleId) return false;

      const { error } = await this.client
        .from(this.tableName)
        .update({ role_id: roleId })
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al actualizar rol de miembro:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al actualizar rol de miembro:", error);
      return false;
    }
  }

  // Eliminar miembro de un proyecto
  async removeMember(projectId, userId) {
    try {
      if (!projectId || !userId) return false;
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al eliminar miembro:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al eliminar miembro:", error);
      return false;
    }
  }
}

export default ProjectMemberRepository;