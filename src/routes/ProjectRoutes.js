import express from "express";
import { ProjectController } from "../controllers/ProjectController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const projectController = new ProjectController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);
router.use(projectController.injectUser);

// Rutas de proyectos
router.get("/", projectController.getAll.bind(projectController));
router.get("/created", projectController.getCreated.bind(projectController));
router.get("/member", projectController.getAsMember.bind(projectController));
router.get("/:id", projectController.getById.bind(projectController));
router.post("/", projectController.create.bind(projectController));
router.put("/:id", projectController.update.bind(projectController));
router.delete("/:id", projectController.delete.bind(projectController));

export default router;
