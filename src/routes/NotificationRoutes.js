import express from 'express';
import NotificationController from '../controllers/NotificationController.js';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';

const router = express.Router();

const verifySupabaseToken = buildSupabaseAuthMiddleware();

// Protected routes
router.use(verifySupabaseToken);

router.get('/', NotificationController.getNotifications);
router.put('/:id/read', NotificationController.markAsRead);
router.get('/preferences', NotificationController.getPreferences);
router.put('/preferences', NotificationController.updatePreferences);
router.post('/trigger', NotificationController.trigger);

// Public/System route (should ideally be protected by a CRON_SECRET header)
router.get('/check-deadlines', NotificationController.checkDeadlines);

export default router;
