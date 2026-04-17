import CommentLikeRepository from "../repositories/CommentLikeRepository.js";
import ProjectCommentRepository from "../repositories/ProjectCommentRepository.js";
import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const commentLikeRepository = new CommentLikeRepository();
const projectCommentRepository = new ProjectCommentRepository();
const projectMemberRepository = new ProjectMemberRepository();

export class CommentLikeService {
  constructor() {
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  // Verificar si usuario puede interactuar con un comentario
  async canInteractWithComment(commentId, userId = null) {
    const userToCheck = userId || this.currentUser?.id;
    if (!userToCheck || !commentId) return false;

    // Obtener el comentario para saber de qué proyecto es
    const comment = await projectCommentRepository.getById(commentId);
    if (!comment) return false;

    // Verificar si es miembro del proyecto
    return await projectMemberRepository.isMember(comment.id_Project, userToCheck);
  }

  // Obtener likes de un comentario
  async getByComment(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      // Verificar acceso
      const canInteract = await this.canInteractWithComment(commentId);
      if (!canInteract) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      const likes = await commentLikeRepository.getByComment(commentId);
      return new OperationResult(true, "Likes obtenidos exitosamente.", likes);
    } catch (error) {
      return new OperationResult(false, `Error al obtener likes: ${error.message}`);
    }
  }

  // Dar/quitar like a un comentario
  async toggleLike(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      // Verificar acceso
      const canInteract = await this.canInteractWithComment(commentId);
      if (!canInteract) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      // Verificar que el comentario existe
      const comment = await projectCommentRepository.getById(commentId);
      if (!comment) {
        return new OperationResult(false, "Comentario no encontrado.");
      }

      const toggled = await commentLikeRepository.toggleLike(this.currentUser.id, commentId);
      if (toggled) {
        const hasLiked = await commentLikeRepository.hasUserLikedComment(this.currentUser.id, commentId);
        const likesCount = await commentLikeRepository.countLikes(commentId);

        return new OperationResult(true, hasLiked ? "Like agregado." : "Like removido.", {
          hasLiked,
          likesCount
        });
      } else {
        return new OperationResult(false, "Error al procesar like.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al procesar like: ${error.message}`);
    }
  }

  // Verificar si usuario dio like a un comentario
  async hasUserLiked(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      // Verificar acceso
      const canInteract = await this.canInteractWithComment(commentId);
      if (!canInteract) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      const hasLiked = await commentLikeRepository.hasUserLikedComment(this.currentUser.id, commentId);
      return new OperationResult(true, "Verificación completada.", { hasLiked });
    } catch (error) {
      return new OperationResult(false, `Error al verificar like: ${error.message}`);
    }
  }

  // Contar likes de un comentario
  async countLikes(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      // Verificar acceso
      const canInteract = await this.canInteractWithComment(commentId);
      if (!canInteract) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      const count = await commentLikeRepository.countLikes(commentId);
      return new OperationResult(true, "Conteo obtenido exitosamente.", { count });
    } catch (error) {
      return new OperationResult(false, `Error al contar likes: ${error.message}`);
    }
  }

  // Obtener likes dados por el usuario actual
  async getUserLikes() {
    try {
      if (!this.currentUser) {
        return new OperationResult(false, "Usuario no autenticado.");
      }

      const likes = await commentLikeRepository.getByUser(this.currentUser.id);
      return new OperationResult(true, "Likes del usuario obtenidos exitosamente.", likes);
    } catch (error) {
      return new OperationResult(false, `Error al obtener likes del usuario: ${error.message}`);
    }
  }

  // Dar like explícitamente
  async likeComment(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      // Verificar acceso
      const canInteract = await this.canInteractWithComment(commentId);
      if (!canInteract) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      const liked = await commentLikeRepository.likeComment(this.currentUser.id, commentId);
      if (liked) {
        const likesCount = await commentLikeRepository.countLikes(commentId);
        return new OperationResult(true, "Like agregado exitosamente.", { likesCount });
      } else {
        return new OperationResult(false, "Error al agregar like.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al dar like: ${error.message}`);
    }
  }

  // Quitar like explícitamente
  async unlikeComment(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      // Verificar acceso
      const canInteract = await this.canInteractWithComment(commentId);
      if (!canInteract) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      const unliked = await commentLikeRepository.unlikeComment(this.currentUser.id, commentId);
      if (unliked) {
        const likesCount = await commentLikeRepository.countLikes(commentId);
        return new OperationResult(true, "Like removido exitosamente.", { likesCount });
      } else {
        return new OperationResult(false, "Error al remover like.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al quitar like: ${error.message}`);
    }
  }
}