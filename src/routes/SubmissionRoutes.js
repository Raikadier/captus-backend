import express from 'express';
import { SubmissionController } from '../controllers/SubmissionController.js';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import { requireTeacherRole } from '../middlewares/requireRole.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';
import { injectUserRole } from '../middlewares/injectUserRole.js';

const router = express.Router();
const controller = new SubmissionController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

router.use(verifySupabaseToken);
router.use(injectUserRole);

router.post('/submit', controller.submit.bind(controller));
router.get('/pending', requireTeacherRole, controller.getPendingReviews.bind(controller));
router.get('/assignment/:id', controller.getByAssignment.bind(controller)); // Teacher gets all, Student gets theirs
router.put('/grade/:id', requireTeacherRole, controller.grade.bind(controller));

export default router;
