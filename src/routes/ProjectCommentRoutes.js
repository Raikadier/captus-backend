import express from "express";
import { ProjectCommentController } from "../controllers/ProjectCommentController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const projectCommentController = new ProjectCommentController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);
router.use(projectCommentController.injectUser);

// Rutas de comentarios de proyecto
router.get("/project/:projectId", projectCommentController.getByProject.bind(projectCommentController));
router.get("/:commentId", projectCommentController.getById.bind(projectCommentController));
router.post("/project/:projectId", projectCommentController.create.bind(projectCommentController));
router.put("/:commentId", projectCommentController.update.bind(projectCommentController));
router.delete("/:commentId", projectCommentController.delete.bind(projectCommentController));
router.get("/:commentId/replies", projectCommentController.getReplies.bind(projectCommentController));

export default router;
