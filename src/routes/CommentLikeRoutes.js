import express from "express";
import { CommentLikeController } from "../controllers/CommentLikeController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const commentLikeController = new CommentLikeController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);
router.use(commentLikeController.injectUser);

// Rutas de likes de comentarios
router.get("/comment/:commentId", commentLikeController.getByComment.bind(commentLikeController));
router.put("/comment/:commentId/toggle", commentLikeController.toggleLike.bind(commentLikeController));
router.get("/comment/:commentId/has-liked", commentLikeController.hasUserLiked.bind(commentLikeController));
router.get("/comment/:commentId/count", commentLikeController.countLikes.bind(commentLikeController));
router.get("/user/likes", commentLikeController.getUserLikes.bind(commentLikeController));
router.post("/comment/:commentId", commentLikeController.likeComment.bind(commentLikeController));
router.delete("/comment/:commentId", commentLikeController.unlikeComment.bind(commentLikeController));

export default router;
