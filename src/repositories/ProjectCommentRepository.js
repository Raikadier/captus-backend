import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_Comment: row.id,
  id_Project: row.project_id,
  id_User: row.user_id,
  id_ParentComment: row.parent_comment_id,
  content: row.content,
  createdAt: row.created_at,
});

const mapToDb = (entity) => ({
  project_id: entity.id_Project,
  user_id: entity.id_User,
  parent_comment_id: entity.id_ParentComment ?? null,
  content: entity.content,
});

class ProjectCommentRepository extends BaseRepository {
  constructor() {
    super("project_comments", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  // Obtener todos los comentarios
  async getAll() {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error al obtener comentarios:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener comentarios:", error);
      return [];
    }
  }

  // Obtener comentarios de un proyecto
  async getByProject(projectId) {
    try {
      if (!projectId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error al obtener comentarios por proyecto:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener comentarios por proyecto:", error);
      return [];
    }
  }

  // Obtener comentarios de un usuario
  async getByUser(userId) {
    try {
      if (!userId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error al obtener comentarios por usuario:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener comentarios por usuario:", error);
      return [];
    }
  }

  // Obtener un comentario por su ID
  async getById(id) {
    try {
      if (!id) return null;
      return super.getById(id);
    } catch (error) {
      console.error("Error al obtener comentario por ID:", error);
      return null;
    }
  }

  // Obtener respuestas de un comentario
  async getReplies(commentId) {
    try {
      if (!commentId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("parent_comment_id", commentId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error al obtener respuestas:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener respuestas:", error);
      return [];
    }
  }

  // Actualizar comentario
  async update(entity) {
    try {
      if (!entity || !entity.id_Comment) return null;
      return super.update(entity.id_Comment, entity);
    } catch (error) {
      console.error("Error al actualizar comentario:", error);
      return null;
    }
  }

  // Eliminar comentario
  async delete(id) {
    try {
      if (!id) return false;
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error al eliminar comentario:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al eliminar comentario:", error);
      return false;
    }
  }
}

export default ProjectCommentRepository;