import express from "express";
import { CategoryController } from "../controllers/CategoryController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const categoryController = new CategoryController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);
router.use(categoryController.injectUser);

// Rutas de categorías
router.get("/", categoryController.getAll.bind(categoryController));
router.get("/:id", categoryController.getById.bind(categoryController));
router.get("/name/:name", categoryController.getByName.bind(categoryController));
router.get("/stats/categories", categoryController.getStats.bind(categoryController));
router.post("/", categoryController.create.bind(categoryController));
router.put("/:id", categoryController.update.bind(categoryController));
router.delete("/:id", categoryController.delete.bind(categoryController));

export default router;
