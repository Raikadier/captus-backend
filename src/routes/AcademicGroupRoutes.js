import express from 'express';
import { AcademicGroupController } from '../controllers/AcademicGroupController.js';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';
import { injectUserRole } from '../middlewares/injectUserRole.js';

const router = express.Router();
const controller = new AcademicGroupController();
const supabaseAdmin = getSupabaseClient();
const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

router.use(verifySupabaseToken);
router.use(injectUserRole);

router.post('/', controller.create.bind(controller));
router.post('/add-member', controller.addMember.bind(controller));
router.get('/my-groups', controller.getMyGroups.bind(controller));
router.get('/course/:id', controller.getByCourse.bind(controller));

export default router;
