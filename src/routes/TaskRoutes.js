import express from "express";
import { TaskController } from "../controllers/TaskController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const taskController = new TaskController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
// router.use(verifySupabaseToken); // Middleware is already applied in server.js
router.use(taskController.injectUser);

// Rutas de tareas
router.get("/", taskController.getAll.bind(taskController));
router.get("/pending", taskController.getPending.bind(taskController));
router.get("/:id", taskController.getById.bind(taskController));
router.post("/", taskController.create.bind(taskController));
router.put("/:id", taskController.update.bind(taskController));
router.delete("/:id", taskController.delete.bind(taskController));
router.put("/:id/complete", taskController.complete.bind(taskController));
router.delete("/category/:categoryId", taskController.deleteByCategory.bind(taskController));

export default router;
