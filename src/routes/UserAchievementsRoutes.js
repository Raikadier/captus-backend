import express from "express";
import { UserAchievementsController } from "../controllers/UserAchievementsController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const userAchievementsController = new UserAchievementsController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Aplicar middleware de autenticación y usuario a todas las rutas
router.use(verifySupabaseToken);
router.use(userAchievementsController.injectUser);

// Rutas de logros de usuario
router.get("/my", userAchievementsController.getMyAchievements.bind(userAchievementsController));
router.get("/user/:userId", userAchievementsController.getByUser.bind(userAchievementsController));
router.get("/stats", userAchievementsController.getStats.bind(userAchievementsController));
router.get("/has/:achievementId", userAchievementsController.hasAchievement.bind(userAchievementsController));
router.post("/unlock/:achievementId", userAchievementsController.unlockAchievement.bind(userAchievementsController));
router.put("/progress/:achievementId", userAchievementsController.updateProgress.bind(userAchievementsController));
router.post("/reset", userAchievementsController.resetAchievements.bind(userAchievementsController));
router.post("/recalculate", userAchievementsController.recalculateAll.bind(userAchievementsController));

export default router;
