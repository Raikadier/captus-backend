import CommentLikeRepository from "../repositories/CommentLikeRepository.js";
import ProjectCommentRepository from "../repositories/ProjectCommentRepository.js";
import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const commentLikeRepository = new CommentLikeRepository();
const projectCommentRepository = new ProjectCommentRepository();
const projectMemberRepository = new ProjectMemberRepository();

export class CommentLikeService {
  // Verify the user is a member of the project that owns the comment
  async canInteractWithComment(commentId, userId) {
    if (!userId || !commentId) return false;
    const comment = await projectCommentRepository.getById(commentId);
    if (!comment) return false;
    return await projectMemberRepository.isMember(comment.id_Project, userId);
  }

  async getByComment(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const canInteract = await this.canInteractWithComment(commentId, userId);
      if (!canInteract)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const likes = await commentLikeRepository.getByComment(commentId);
      return new OperationResult(true, "Likes obtenidos exitosamente.", likes);
    } catch (error) {
      return new OperationResult(false, `Error al obtener likes: ${error.message}`);
    }
  }

  async toggleLike(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const canInteract = await this.canInteractWithComment(commentId, userId);
      if (!canInteract)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment)
        return new OperationResult(false, "Comentario no encontrado.");

      const toggled = await commentLikeRepository.toggleLike(userId, commentId);
      if (toggled) {
        const hasLiked   = await commentLikeRepository.hasUserLikedComment(userId, commentId);
        const likesCount = await commentLikeRepository.countLikes(commentId);
        return new OperationResult(true, hasLiked ? "Like agregado." : "Like removido.", {
          hasLiked,
          likesCount
        });
      }
      return new OperationResult(false, "Error al procesar like.");
    } catch (error) {
      return new OperationResult(false, `Error al procesar like: ${error.message}`);
    }
  }

  async hasUserLiked(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const canInteract = await this.canInteractWithComment(commentId, userId);
      if (!canInteract)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const hasLiked = await commentLikeRepository.hasUserLikedComment(userId, commentId);
      return new OperationResult(true, "Verificación completada.", { hasLiked });
    } catch (error) {
      return new OperationResult(false, `Error al verificar like: ${error.message}`);
    }
  }

  async countLikes(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const canInteract = await this.canInteractWithComment(commentId, userId);
      if (!canInteract)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const count = await commentLikeRepository.countLikes(commentId);
      return new OperationResult(true, "Conteo obtenido exitosamente.", { count });
    } catch (error) {
      return new OperationResult(false, `Error al contar likes: ${error.message}`);
    }
  }

  async getUserLikes(userId) {
    try {
      if (!userId)
        return new OperationResult(false, "Usuario no autenticado.");

      const likes = await commentLikeRepository.getByUser(userId);
      return new OperationResult(true, "Likes del usuario obtenidos exitosamente.", likes);
    } catch (error) {
      return new OperationResult(false, `Error al obtener likes del usuario: ${error.message}`);
    }
  }

  async likeComment(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const canInteract = await this.canInteractWithComment(commentId, userId);
      if (!canInteract)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const liked = await commentLikeRepository.likeComment(userId, commentId);
      if (liked) {
        const likesCount = await commentLikeRepository.countLikes(commentId);
        return new OperationResult(true, "Like agregado exitosamente.", { likesCount });
      }
      return new OperationResult(false, "Error al agregar like.");
    } catch (error) {
      return new OperationResult(false, `Error al dar like: ${error.message}`);
    }
  }

  async unlikeComment(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const canInteract = await this.canInteractWithComment(commentId, userId);
      if (!canInteract)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const unliked = await commentLikeRepository.unlikeComment(userId, commentId);
      if (unliked) {
        const likesCount = await commentLikeRepository.countLikes(commentId);
        return new OperationResult(true, "Like removido exitosamente.", { likesCount });
      }
      return new OperationResult(false, "Error al remover like.");
    } catch (error) {
      return new OperationResult(false, `Error al quitar like: ${error.message}`);
    }
  }
}
