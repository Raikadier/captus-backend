import express from "express";
import { StatisticsController } from "../controllers/StatisticsController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const statisticsController = new StatisticsController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
// router.use(verifySupabaseToken); // Middleware is already applied in server.js
router.use(statisticsController.injectUser);

// Rutas de estadísticas
router.get("/", statisticsController.getByUser.bind(statisticsController));
router.get("/dashboard", statisticsController.getByUser.bind(statisticsController)); // ✅ Fix for 404
router.get("/tasks", statisticsController.getTaskStats.bind(statisticsController)); // ✅ New route
router.get("/additional", statisticsController.getAdditionalStats.bind(statisticsController)); // ✅ New route for widgets
router.get("/home-page", statisticsController.getHomePageStats.bind(statisticsController));
router.get("/streak-stats", statisticsController.getStreakStats.bind(statisticsController));
router.put("/", statisticsController.update.bind(statisticsController));
router.put("/daily-goal", statisticsController.updateDailyGoal.bind(statisticsController));
router.post("/check-achievements", statisticsController.checkAchievements.bind(statisticsController));
router.get("/achievements-stats", statisticsController.getAchievementsStats.bind(statisticsController));

export default router;
