import express from 'express';
import { TelegramController } from '../controllers/TelegramController.js';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';

const router = express.Router();
const controller = new TelegramController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Webhook doesn't need auth, it comes from Telegram
router.post('/webhook', controller.handleWebhook.bind(controller));

// Protected routes
router.use(verifySupabaseToken);
router.post('/generate-code', controller.generateLinkCode.bind(controller));
router.post('/unlink', controller.unlink.bind(controller));
router.get('/status', controller.getStatus.bind(controller));

export default router;
