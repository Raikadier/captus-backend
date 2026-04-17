import ProjectCommentRepository from "../repositories/ProjectCommentRepository.js";
import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import CommentLikeRepository from "../repositories/CommentLikeRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const projectCommentRepository = new ProjectCommentRepository();
const projectMemberRepository = new ProjectMemberRepository();
const commentLikeRepository = new CommentLikeRepository();

export class ProjectCommentService {
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

  // Obtener comentarios de un proyecto
  async getByProject(projectId) {
    try {
      if (!projectId || projectId <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      // Verificar membresía
      const isMember = await this.isProjectMember(projectId);
      if (!isMember) {
        return new OperationResult(false, "No tienes acceso a este proyecto.");
      }

      const comments = await projectCommentRepository.getByProject(projectId);

      // Agregar información de likes para cada comentario
      for (const comment of comments) {
        comment.likesCount = await commentLikeRepository.countLikes(comment.id_Comment);
        comment.userLiked = await commentLikeRepository.hasUserLiked(
          comment.id_Comment, this.currentUser.id
        );
      }

      return new OperationResult(true, "Comentarios obtenidos exitosamente.", comments);
    } catch (error) {
      return new OperationResult(false, `Error al obtener comentarios: ${error.message}`);
    }
  }

  // Obtener comentario por ID
  async getById(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment) {
        return new OperationResult(false, "Comentario no encontrado.");
      }

      // Verificar que el usuario tenga acceso al proyecto
      const isMember = await this.isProjectMember(comment.id_Project);
      if (!isMember) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      // Agregar información de likes
      comment.likesCount = await commentLikeRepository.countLikes(commentId);
      comment.userLiked = await commentLikeRepository.hasUserLiked(
        commentId, this.currentUser.id
      );

      return new OperationResult(true, "Comentario obtenido exitosamente.", comment);
    } catch (error) {
      return new OperationResult(false, `Error al obtener comentario: ${error.message}`);
    }
  }

  // Crear comentario en un proyecto
  async create(projectId, commentData) {
    try {
      if (!projectId || projectId <= 0) {
        return new OperationResult(false, "ID de proyecto inválido.");
      }

      // Verificar membresía
      const isMember = await this.isProjectMember(projectId);
      if (!isMember) {
        return new OperationResult(false, "No tienes acceso a este proyecto.");
      }

      if (!commentData.content || commentData.content.trim() === "") {
        return new OperationResult(false, "El contenido del comentario es requerido.");
      }

      const comment = await projectCommentRepository.save({
        id_Project: projectId,
        id_User: this.currentUser.id,
        content: commentData.content,
        id_ParentComment: commentData.parentCommentId || null
      });

      if (comment) {
        return new OperationResult(true, "Comentario creado exitosamente.", comment);
      } else {
        return new OperationResult(false, "Error al crear comentario.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al crear comentario: ${error.message}`);
    }
  }

  // Actualizar comentario (solo autor)
  async update(commentId, commentData) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment) {
        return new OperationResult(false, "Comentario no encontrado.");
      }

      // Solo el autor puede editar
      if (comment.id_User !== this.currentUser.id) {
        return new OperationResult(false, "Solo puedes editar tus propios comentarios.");
      }

      if (!commentData.content || commentData.content.trim() === "") {
        return new OperationResult(false, "El contenido del comentario es requerido.");
      }

      const updated = await projectCommentRepository.update({
        id_Comment: commentId,
        content: commentData.content
      });

      if (updated) {
        return new OperationResult(true, "Comentario actualizado exitosamente.");
      } else {
        return new OperationResult(false, "Error al actualizar comentario.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al actualizar comentario: ${error.message}`);
    }
  }

  // Eliminar comentario (autor o admin del proyecto)
  async delete(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment) {
        return new OperationResult(false, "Comentario no encontrado.");
      }

      // Verificar permisos: autor o admin del proyecto
      const isAuthor = comment.id_User === this.currentUser.id;
      const isAdmin = await projectMemberRepository.isMember(comment.id_Project, this.currentUser.id) &&
                     await this.isProjectAdmin(comment.id_Project);

      if (!isAuthor && !isAdmin) {
        return new OperationResult(false, "No tienes permisos para eliminar este comentario.");
      }

      const deleted = await projectCommentRepository.delete(commentId);
      if (deleted) {
        return new OperationResult(true, "Comentario eliminado exitosamente.");
      } else {
        return new OperationResult(false, "Error al eliminar comentario.");
      }
    } catch (error) {
      return new OperationResult(false, `Error al eliminar comentario: ${error.message}`);
    }
  }

  // Obtener respuestas de un comentario
  async getReplies(commentId) {
    try {
      if (!commentId || commentId <= 0) {
        return new OperationResult(false, "ID de comentario inválido.");
      }

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment) {
        return new OperationResult(false, "Comentario no encontrado.");
      }

      // Verificar acceso al proyecto
      const isMember = await this.isProjectMember(comment.id_Project);
      if (!isMember) {
        return new OperationResult(false, "No tienes acceso a este comentario.");
      }

      const replies = await projectCommentRepository.getReplies(commentId);

      // Agregar información de likes
      for (const reply of replies) {
        reply.likesCount = await commentLikeRepository.countLikes(reply.id_Comment);
        reply.userLiked = await commentLikeRepository.hasUserLiked(
          reply.id_Comment, this.currentUser.id
        );
      }

      return new OperationResult(true, "Respuestas obtenidas exitosamente.", replies);
    } catch (error) {
      return new OperationResult(false, `Error al obtener respuestas: ${error.message}`);
    }
  }

  // Verificar si usuario es admin (helper)
  async isProjectAdmin(projectId, userId = null) {
    const userToCheck = userId || this.currentUser?.id;
    if (!userToCheck || !projectId) return false;

    const role = await projectMemberRepository.getUserRole(projectId, userToCheck);
    return role && (role.name === "Administrador" || role.name === "Admin");
  }
}