import express from "express";
import { ProjectMemberController } from "../controllers/ProjectMemberController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const projectMemberController = new ProjectMemberController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación a todas las rutas
router.use(verifySupabaseToken);

// Rutas de miembros de proyecto
router.get("/project/:projectId", projectMemberController.getByProject.bind(projectMemberController));
router.post("/project/:projectId", projectMemberController.addMember.bind(projectMemberController));
router.put("/project/:projectId/user/:userId/role", projectMemberController.updateMemberRole.bind(projectMemberController));
router.delete("/project/:projectId/user/:userId", projectMemberController.removeMember.bind(projectMemberController));
router.get("/project/:projectId/user/:userId/role", projectMemberController.getUserRole.bind(projectMemberController));
router.get("/project/:projectId/user/:userId/is-member", projectMemberController.isMember.bind(projectMemberController));

export default router;
