import express from 'express';
import { CourseController } from '../controllers/CourseController.js';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import { requireTeacherRole } from '../middlewares/requireRole.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';
import { injectUserRole } from '../middlewares/injectUserRole.js';

const router = express.Router();
const controller = new CourseController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Middleware pipeline
router.use(verifySupabaseToken);
router.use(injectUserRole);

// Routes
router.get('/teacher', requireTeacherRole, controller.getTeacherCourses.bind(controller));
router.get('/student', controller.getStudentCourses.bind(controller)); // Student can just be authenticated

router.get('/:id', controller.getById.bind(controller));

router.post('/', requireTeacherRole, controller.create.bind(controller));
router.put('/:id', requireTeacherRole, controller.update.bind(controller));
router.delete('/:id', requireTeacherRole, controller.delete.bind(controller));
router.get('/:id/grades/download', requireTeacherRole, controller.downloadGrades.bind(controller));

export default router;
