import express from "express";
import { EventsController } from "../controllers/EventsController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const eventsController = new EventsController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación a todas las rutas
router.use(verifySupabaseToken);

// Rutas de eventos
router.get("/", eventsController.getAll.bind(eventsController));
router.get("/upcoming", eventsController.getUpcoming.bind(eventsController));
router.get("/date-range", eventsController.getByDateRange.bind(eventsController));
router.get("/:id", eventsController.getById.bind(eventsController));
router.post("/", eventsController.create.bind(eventsController));
router.put("/:id", eventsController.update.bind(eventsController));
router.delete("/:id", eventsController.delete.bind(eventsController));

// Ruta para verificar eventos próximos (para notificaciones automáticas)
router.post("/check-upcoming", eventsController.checkUpcomingEvents.bind(eventsController));

export default router;