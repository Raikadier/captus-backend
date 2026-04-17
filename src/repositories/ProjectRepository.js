import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_Project: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  id_Creator: row.creator_id,
});

const mapToDb = (entity) => ({
  name: entity.name,
  description: entity.description ?? null,
  creator_id: entity.id_Creator,
});

class ProjectRepository extends BaseRepository {
  constructor() {
    super("projects", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  // Obtener todos los proyectos
  async getAll() {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*");

      if (error) {
        console.error("Error al obtener proyectos:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener proyectos:", error);
      return [];
    }
  }

  // Obtener proyectos de un usuario (como creador)
  async getByCreator(creatorId) {
    try {
      if (!creatorId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("creator_id", creatorId);

      if (error) {
        console.error("Error al obtener proyectos por creador:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener proyectos por creador:", error);
      return [];
    }
  }

  // Obtener un proyecto por su ID
  async getById(id) {
    try {
      if (!id) return null;
      return super.getById(id);
    } catch (error) {
      console.error("Error al obtener proyecto por ID:", error);
      return null;
    }
  }

  // Obtener un proyecto por su nombre
  async getByName(name) {
    try {
      if (!name) return null;
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("name", name)
        .maybeSingle();

      if (error) {
        console.error("Error al obtener proyecto por nombre:", error.message);
        return null;
      }

      return data ? mapFromDb(data) : null;
    } catch (error) {
      console.error("Error al obtener proyecto por nombre:", error);
      return null;
    }
  }

  // Actualizar proyecto
  async update(entity) {
    try {
      if (!entity || !entity.id_Project) return null;
      return super.update(entity.id_Project, entity);
    } catch (error) {
      console.error("Error al actualizar proyecto:", error);
      return null;
    }
  }

  // Eliminar proyecto
  async delete(id) {
    try {
      if (!id) return false;
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error al eliminar proyecto:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al eliminar proyecto:", error);
      return false;
    }
  }
}

export default ProjectRepository;