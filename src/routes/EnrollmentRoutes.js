import express from 'express';
import { EnrollmentController } from '../controllers/EnrollmentController.js';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import { requireTeacherRole } from '../middlewares/requireRole.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';
import { injectUserRole } from '../middlewares/injectUserRole.js';

const router = express.Router();
const controller = new EnrollmentController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

router.use(verifySupabaseToken);
router.use(injectUserRole);

router.post('/add-student', requireTeacherRole, controller.addStudent.bind(controller));
router.post('/join-by-code', controller.joinByCode.bind(controller));
router.get('/course/:id/students', controller.getStudents.bind(controller));

export default router;
