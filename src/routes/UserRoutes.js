import express from "express";
import { UserController } from "../controllers/UserController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const userController = new UserController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Rutas públicas
// check-email se mantiene pública para validaciones de registro
router.post("/check-email", userController.isEmailRegistered.bind(userController));

// Rutas protegidas (requieren token)
router.use(verifySupabaseToken);

// Endpoint de Sincronización (Tu nueva feature)
router.post("/sync", userController.syncUser.bind(userController));

// Gestión de Perfil
router.get("/profile", userController.getProfile.bind(userController));
router.get("/:id", userController.getProfile.bind(userController));
router.put("/:id", userController.updateProfile.bind(userController));

// Rutas preservadas de Main (útiles)
router.put("/change-password", userController.changePassword.bind(userController));
router.delete("/account", userController.deleteAccount.bind(userController));

// Legacy/Teammate routes preserved
router.delete("/account", userController.deleteAccount.bind(userController));
router.post("/check-email", userController.isEmailRegistered.bind(userController));

export default router;