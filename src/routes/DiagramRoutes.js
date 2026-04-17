import express from "express";
import { DiagramController } from "../controllers/DiagramController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const diagramController = new DiagramController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

router.use(verifySupabaseToken);
router.use(diagramController.injectUser);

router.get("/", diagramController.getAll.bind(diagramController));
router.post("/", diagramController.create.bind(diagramController));
router.put("/:id", diagramController.update.bind(diagramController));
router.delete("/:id", diagramController.delete.bind(diagramController));

export default router;
