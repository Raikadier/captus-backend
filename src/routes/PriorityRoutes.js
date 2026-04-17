import express from "express";
import { PriorityController } from "../controllers/PriorityController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const priorityController = new PriorityController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Rutas de prioridades (datos maestros, requieren autenticación)
router.use(verifySupabaseToken);

router.get("/", priorityController.getAll.bind(priorityController));
router.get("/:id", priorityController.getById.bind(priorityController));

export default router;
