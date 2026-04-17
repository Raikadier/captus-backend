import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id_Like: row.id,
  id_User: row.user_id,
  id_Comment: row.comment_id,
  createdAt: row.created_at,
});

const mapToDb = (entity) => ({
  user_id: entity.id_User,
  comment_id: entity.id_Comment,
});

class CommentLikeRepository extends BaseRepository {
  constructor() {
    super("comment_likes", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }

  // Obtener todos los likes
  async getAll() {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al obtener likes:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener likes:", error);
      return [];
    }
  }

  // Obtener likes de un comentario
  async getByComment(commentId) {
    try {
      if (!commentId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("comment_id", commentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al obtener likes por comentario:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener likes por comentario:", error);
      return [];
    }
  }

  // Obtener likes de un usuario
  async getByUser(userId) {
    try {
      if (!userId) return [];
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al obtener likes por usuario:", error.message);
        return [];
      }

      return data.map(mapFromDb);
    } catch (error) {
      console.error("Error al obtener likes por usuario:", error);
      return [];
    }
  }

  // Obtener un like por su ID
  async getById(id) {
    try {
      if (!id) return null;
      return super.getById(id);
    } catch (error) {
      console.error("Error al obtener like por ID:", error);
      return null;
    }
  }

  // Verificar si un usuario ya likió un comentario
  async hasUserLiked(commentId, userId) {
    try {
      if (!commentId || !userId) return false;
      const { data, error } = await this.client
        .from(this.tableName)
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error al verificar like:", error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error al verificar like:", error);
      return false;
    }
  }

  // Alias para compatibilidad
  async hasUserLikedComment(userId, commentId) {
    return this.hasUserLiked(commentId, userId);
  }

  // Agregar like a un comentario
  async addLike(commentId, userId) {
    try {
      if (!commentId || !userId) return false;

      // Verificar si ya existe
      const existingLike = await this.hasUserLiked(commentId, userId);
      if (existingLike) return false;

      const { error } = await this.client
        .from(this.tableName)
        .insert(mapToDb({ id_User: userId, id_Comment: commentId }));

      if (error) {
        console.error("Error al agregar like:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al agregar like:", error);
      return false;
    }
  }

  // Remover like de un comentario
  async removeLike(commentId, userId) {
    try {
      if (!commentId || !userId) return false;
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al remover like:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al remover like:", error);
      return false;
    }
  }

  // Contar likes de un comentario
  async countLikes(commentId) {
    try {
      if (!commentId) return 0;
      const { count, error } = await this.client
        .from(this.tableName)
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId);

      if (error) {
        console.error("Error al contar likes:", error.message);
        return 0;
      }

      return count;
    } catch (error) {
      console.error("Error al contar likes:", error);
      return 0;
    }
  }

  // Eliminar like por ID
  async delete(id) {
    try {
      if (!id) return false;
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error al eliminar like:", error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error al eliminar like:", error);
      return false;
    }
  }

  // Toggle like (agregar si no existe, remover si existe)
  async toggleLike(userId, commentId) {
    try {
      if (!userId || !commentId) return false;

      const hasLiked = await this.hasUserLiked(commentId, userId);
      if (hasLiked) {
        return await this.removeLike(commentId, userId);
      } else {
        return await this.addLike(commentId, userId);
      }
    } catch (error) {
      console.error("Error al toggle like:", error);
      return false;
    }
  }

  // Agregar like explícitamente
  async likeComment(userId, commentId) {
    return this.addLike(commentId, userId);
  }

  // Remover like explícitamente
  async unlikeComment(userId, commentId) {
    return this.removeLike(commentId, userId);
  }
}

export default CommentLikeRepository;