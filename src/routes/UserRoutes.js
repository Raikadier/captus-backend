import express from "express";
import { UserController } from "../controllers/UserController.js";
import buildSupabaseAuthMiddleware from "../middlewares/verifySupabaseToken.js";
import { getSupabaseClient } from "../lib/supabaseAdmin.js";

const router = express.Router();
const userController = new UserController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// ── Public routes (no auth required) ─────────────────────────────────────────
router.post("/check-email", userController.isEmailRegistered.bind(userController));

// ── Protected routes (auth required) ─────────────────────────────────────────
router.use(verifySupabaseToken);

router.post("/sync",    userController.syncUser.bind(userController));
router.get("/profile",  userController.getProfile.bind(userController));

// IMPORTANT: specific named routes MUST come before wildcard /:id routes,
// otherwise Express matches /:id first and these handlers are never reached.
router.put("/change-password", userController.changePassword.bind(userController));
router.delete("/account",      userController.deleteAccount.bind(userController));

// Wildcard routes last (catch-all by id)
router.get("/:id",  userController.getProfile.bind(userController));
router.put("/:id",  userController.updateProfile.bind(userController));

export default router;