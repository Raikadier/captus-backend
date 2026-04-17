import express from "express";
import { NotesController } from "../controllers/NotesController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const notesController = new NotesController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);

// Rutas de notas
router.get("/", notesController.getAll.bind(notesController));
router.get("/:id", notesController.getById.bind(notesController));
router.post("/", notesController.create.bind(notesController));
router.put("/:id", notesController.update.bind(notesController));
router.put("/:id/toggle-pin", notesController.togglePin.bind(notesController));
router.delete("/:id", notesController.delete.bind(notesController));

export default router;