import express from "express";
import { SubTaskController } from "../controllers/SubTaskController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const subTaskController = new SubTaskController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);
router.use(subTaskController.injectUser);

// Rutas de subtareas
router.get("/", subTaskController.getAll.bind(subTaskController));
router.get("/:id", subTaskController.getById.bind(subTaskController));
router.get("/task/:taskId", subTaskController.getByTask.bind(subTaskController));
router.get("/tasks/with-subtasks", subTaskController.getTaskIdsWithSubTasks.bind(subTaskController));
router.post("/", subTaskController.create.bind(subTaskController));
router.put("/:id", subTaskController.update.bind(subTaskController));
router.delete("/:id", subTaskController.delete.bind(subTaskController));
router.put("/:id/complete", subTaskController.complete.bind(subTaskController));

export default router;
