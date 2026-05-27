import { CommentLikeService } from "../services/CommentLikeService.js";

export class CommentLikeController {
  constructor() {
    this.commentLikeService = new CommentLikeService();
  }

  async getByComment(req, res) {
    const { commentId } = req.params;
    const result = await this.commentLikeService.getByComment(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 403).json(result);
  }

  async toggleLike(req, res) {
    const { commentId } = req.params;
    const result = await this.commentLikeService.toggleLike(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }

  async hasUserLiked(req, res) {
    const { commentId } = req.params;
    const result = await this.commentLikeService.hasUserLiked(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 403).json(result);
  }

  async countLikes(req, res) {
    const { commentId } = req.params;
    const result = await this.commentLikeService.countLikes(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 403).json(result);
  }

  async getUserLikes(req, res) {
    const result = await this.commentLikeService.getUserLikes(req.user.id);
    res.status(result.success ? 200 : 401).json(result);
  }

  async likeComment(req, res) {
    const { commentId } = req.params;
    const result = await this.commentLikeService.likeComment(parseInt(commentId), req.user.id);
    res.status(result.success ? 201 : 400).json(result);
  }

  async unlikeComment(req, res) {
    const { commentId } = req.params;
    const result = await this.commentLikeService.unlikeComment(parseInt(commentId), req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  }
}
