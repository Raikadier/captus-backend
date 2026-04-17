import { CommentLikeService } from "../services/CommentLikeService.js";

const commentLikeService = new CommentLikeService();

export class CommentLikeController {
  constructor() {
    // Middleware para inyectar usuario en el servicio
    this.injectUser = (req, res, next) => {
      if (req.user) {
        commentLikeService.setCurrentUser(req.user);
      }
      next();
    };
  }

  async getByComment(req, res) {
    const { commentId } = req.params;
    const result = await commentLikeService.getByComment(parseInt(commentId));
    res.status(result.success ? 200 : 403).json(result);
  }

  async toggleLike(req, res) {
    const { commentId } = req.params;
    const result = await commentLikeService.toggleLike(parseInt(commentId));
    res.status(result.success ? 200 : 400).json(result);
  }

  async hasUserLiked(req, res) {
    const { commentId } = req.params;
    const result = await commentLikeService.hasUserLiked(parseInt(commentId));
    res.status(result.success ? 200 : 403).json(result);
  }

  async countLikes(req, res) {
    const { commentId } = req.params;
    const result = await commentLikeService.countLikes(parseInt(commentId));
    res.status(result.success ? 200 : 403).json(result);
  }

  async getUserLikes(req, res) {
    const result = await commentLikeService.getUserLikes();
    res.status(result.success ? 200 : 401).json(result);
  }

  async likeComment(req, res) {
    const { commentId } = req.params;
    const result = await commentLikeService.likeComment(parseInt(commentId));
    res.status(result.success ? 201 : 400).json(result);
  }

  async unlikeComment(req, res) {
    const { commentId } = req.params;
    const result = await commentLikeService.unlikeComment(parseInt(commentId));
    res.status(result.success ? 200 : 400).json(result);
  }
}