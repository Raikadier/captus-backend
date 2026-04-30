import { Router } from 'express';
import buildSupabaseAuthMiddleware from '../middlewares/verifySupabaseToken.js';
import injectUserRole from '../middlewares/injectUserRole.js';
import requireSuperAdminRole from '../middlewares/requireSuperAdminRole.js';
import SuperAdminController from '../controllers/SuperAdminController.js';
import { getSupabaseClient } from '../lib/supabaseAdmin.js';

const router     = Router();
const ctrl       = new SuperAdminController();
const supabase   = getSupabaseClient();
const verify     = buildSupabaseAuthMiddleware(supabase);

// All superadmin routes require: valid JWT + superadmin role
router.use(verify, injectUserRole, requireSuperAdminRole);

// ── Platform stats ─────────────────────────────────────────────────────────
router.get('/stats', (req, res) => ctrl.getStats(req, res));

// ── Institutions ───────────────────────────────────────────────────────────
router.get   ('/institutions',              (req, res) => ctrl.listInstitutions(req, res));
router.get   ('/institutions/:id',          (req, res) => ctrl.getInstitution(req, res));
router.put   ('/institutions/:id',          (req, res) => ctrl.updateInstitution(req, res));
router.patch ('/institutions/:id/disable',  (req, res) => ctrl.disableInstitution(req, res));
router.patch ('/institutions/:id/enable',   (req, res) => ctrl.enableInstitution(req, res));

// ── Users (global) ─────────────────────────────────────────────────────────
router.get   ('/users',                     (req, res) => ctrl.listUsers(req, res));
router.patch ('/users/:userId/role',        (req, res) => ctrl.changeUserRole(req, res));
router.delete('/users/:userId/institution', (req, res) => ctrl.removeUser(req, res));

// ── Audit log ──────────────────────────────────────────────────────────────
router.get('/audit-log',                    (req, res) => ctrl.getAuditLog(req, res));

export default router;
