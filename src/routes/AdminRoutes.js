import express from 'express';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import { injectUserRole } from '../middlewares/injectUserRole.js';
import { requireAdminRole } from '../middlewares/requireRole.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';
import AdminController from '../controllers/AdminController.js';

const router = express.Router();
const ctrl   = new AdminController();
const verify = buildSupabaseAuthMiddleware(getSupabaseClient());

// All admin routes require auth + admin role
router.use(verify);
router.use(injectUserRole);
router.use(requireAdminRole);

// ── Institution ─────────────────────────────────────────────────────────────
router.get   ('/institution',        ctrl.getInstitution.bind(ctrl));
router.post  ('/institution',        ctrl.createInstitution.bind(ctrl));
router.put   ('/institution/:id',    ctrl.updateInstitution.bind(ctrl));
router.get   ('/stats',              ctrl.getDashboardStats.bind(ctrl));

// ── Users / Members ─────────────────────────────────────────────────────────
router.get   ('/users',                        ctrl.getMembers.bind(ctrl));
router.post  ('/users/invite',                 ctrl.inviteUser.bind(ctrl));
router.delete('/users/:userId',                ctrl.removeUser.bind(ctrl));
router.patch ('/users/:userId/role',           ctrl.changeUserRole.bind(ctrl));

// ── Courses ─────────────────────────────────────────────────────────────────
router.get   ('/courses',                           ctrl.getCourses.bind(ctrl));
router.post  ('/courses',                           ctrl.createCourse.bind(ctrl));
router.post  ('/courses/:courseId/assign-teacher',  ctrl.assignTeacher.bind(ctrl));
router.post  ('/courses/:courseId/bulk-enroll',     ctrl.bulkEnroll.bind(ctrl));

// ── Grading Scales ───────────────────────────────────────────────────────────
router.get   ('/grading-scales',                          ctrl.getGradingScales.bind(ctrl));
router.post  ('/grading-scales',                          ctrl.createGradingScale.bind(ctrl));
router.put   ('/grading-scales/:scaleId',                 ctrl.updateGradingScale.bind(ctrl));
router.delete('/grading-scales/:scaleId',                 ctrl.deleteGradingScale.bind(ctrl));
router.patch ('/grading-scales/:scaleId/set-default',     ctrl.setDefaultGradingScale.bind(ctrl));

// ── Academic Periods ─────────────────────────────────────────────────────────
router.get   ('/periods',                        ctrl.getPeriods.bind(ctrl));
router.post  ('/periods',                        ctrl.createPeriod.bind(ctrl));
router.put   ('/periods/:periodId',              ctrl.updatePeriod.bind(ctrl));
router.delete('/periods/:periodId',              ctrl.deletePeriod.bind(ctrl));
router.patch ('/periods/:periodId/set-active',   ctrl.setActivePeriod.bind(ctrl));

export default router;
