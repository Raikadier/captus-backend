import ProjectCommentRepository from "../repositories/ProjectCommentRepository.js";
import ProjectMemberRepository from "../repositories/ProjectMemberRepository.js";
import CommentLikeRepository from "../repositories/CommentLikeRepository.js";
import { OperationResult } from "../shared/OperationResult.js";

const projectCommentRepository = new ProjectCommentRepository();
const projectMemberRepository  = new ProjectMemberRepository();
const commentLikeRepository    = new CommentLikeRepository();

export class ProjectCommentService {
  async isProjectMember(projectId, userId) {
    if (!userId || !projectId) return false;
    return await projectMemberRepository.isMember(projectId, userId);
  }

  async isProjectAdmin(projectId, userId) {
    if (!userId || !projectId) return false;
    const role = await projectMemberRepository.getUserRole(projectId, userId);
    return role && (role.name === "Administrador" || role.name === "Admin");
  }

  async getByProject(projectId, userId) {
    try {
      if (!projectId || projectId <= 0)
        return new OperationResult(false, "ID de proyecto inválido.");

      const isMember = await this.isProjectMember(projectId, userId);
      if (!isMember)
        return new OperationResult(false, "No tienes acceso a este proyecto.");

      const comments = await projectCommentRepository.getByProject(projectId);

      for (const comment of comments) {
        comment.likesCount = await commentLikeRepository.countLikes(comment.id_Comment);
        comment.userLiked  = await commentLikeRepository.hasUserLiked(comment.id_Comment, userId);
      }

      return new OperationResult(true, "Comentarios obtenidos exitosamente.", comments);
    } catch (error) {
      return new OperationResult(false, `Error al obtener comentarios: ${error.message}`);
    }
  }

  async getById(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment)
        return new OperationResult(false, "Comentario no encontrado.");

      const isMember = await this.isProjectMember(comment.id_Project, userId);
      if (!isMember)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      comment.likesCount = await commentLikeRepository.countLikes(commentId);
      comment.userLiked  = await commentLikeRepository.hasUserLiked(commentId, userId);

      return new OperationResult(true, "Comentario obtenido exitosamente.", comment);
    } catch (error) {
      return new OperationResult(false, `Error al obtener comentario: ${error.message}`);
    }
  }

  async create(projectId, commentData, userId) {
    try {
      if (!projectId || projectId <= 0)
        return new OperationResult(false, "ID de proyecto inválido.");

      const isMember = await this.isProjectMember(projectId, userId);
      if (!isMember)
        return new OperationResult(false, "No tienes acceso a este proyecto.");

      if (!commentData.content || commentData.content.trim() === "")
        return new OperationResult(false, "El contenido del comentario es requerido.");

      const comment = await projectCommentRepository.save({
        id_Project:       projectId,
        id_User:          userId,
        content:          commentData.content,
        id_ParentComment: commentData.parentCommentId || null,
      });

      return comment
        ? new OperationResult(true, "Comentario creado exitosamente.", comment)
        : new OperationResult(false, "Error al crear comentario.");
    } catch (error) {
      return new OperationResult(false, `Error al crear comentario: ${error.message}`);
    }
  }

  async update(commentId, commentData, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment)
        return new OperationResult(false, "Comentario no encontrado.");

      if (comment.id_User !== userId)
        return new OperationResult(false, "Solo puedes editar tus propios comentarios.");

      if (!commentData.content || commentData.content.trim() === "")
        return new OperationResult(false, "El contenido del comentario es requerido.");

      const updated = await projectCommentRepository.update({
        id_Comment: commentId,
        content:    commentData.content,
      });

      return updated
        ? new OperationResult(true, "Comentario actualizado exitosamente.")
        : new OperationResult(false, "Error al actualizar comentario.");
    } catch (error) {
      return new OperationResult(false, `Error al actualizar comentario: ${error.message}`);
    }
  }

  async delete(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment)
        return new OperationResult(false, "Comentario no encontrado.");

      const isAuthor = comment.id_User === userId;
      const isAdmin  = await this.isProjectAdmin(comment.id_Project, userId);

      if (!isAuthor && !isAdmin)
        return new OperationResult(false, "No tienes permisos para eliminar este comentario.");

      const deleted = await projectCommentRepository.delete(commentId);
      return deleted
        ? new OperationResult(true, "Comentario eliminado exitosamente.")
        : new OperationResult(false, "Error al eliminar comentario.");
    } catch (error) {
      return new OperationResult(false, `Error al eliminar comentario: ${error.message}`);
    }
  }

  async getReplies(commentId, userId) {
    try {
      if (!commentId || commentId <= 0)
        return new OperationResult(false, "ID de comentario inválido.");

      const comment = await projectCommentRepository.getById(commentId);
      if (!comment)
        return new OperationResult(false, "Comentario no encontrado.");

      const isMember = await this.isProjectMember(comment.id_Project, userId);
      if (!isMember)
        return new OperationResult(false, "No tienes acceso a este comentario.");

      const replies = await projectCommentRepository.getReplies(commentId);

      for (const reply of replies) {
        reply.likesCount = await commentLikeRepository.countLikes(reply.id_Comment);
        reply.userLiked  = await commentLikeRepository.hasUserLiked(reply.id_Comment, userId);
      }

      return new OperationResult(true, "Respuestas obtenidas exitosamente.", replies);
    } catch (error) {
      return new OperationResult(false, `Error al obtener respuestas: ${error.message}`);
    }
  }
}
