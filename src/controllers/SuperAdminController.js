import SuperAdminService from '../services/SuperAdminService.js';
import { OperationResult } from '../shared/OperationResult.js';
import { ctrl } from '../shared/asyncHandler.js';

const svc = new SuperAdminService();

/** Extract real IP from request (Vercel / Express) */
const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null;

export default class SuperAdminController {

  // ── Platform stats ─────────────────────────────────────────────────────────

  getStats = ctrl(async () => {
    return svc.getPlatformStats();
  }, { ok: 200, fail: 500 });

  // ── Institutions ───────────────────────────────────────────────────────────

  listInstitutions = ctrl(async (req) => {
    const { page = 1, limit = 20, search = '' } = req.query;
    return svc.listInstitutions({ page: +page, limit: Math.min(+limit, 100), search });
  }, { ok: 200, fail: 500 });

  getInstitution = ctrl(async (req) => {
    return svc.getInstitutionDetail(req.params.id);
  }, { ok: 200, fail: 404 });

  updateInstitution = ctrl(async (req) => {
    return svc.updateInstitution(req.params.id, req.body, req.user.id, clientIp(req));
  });

  disableInstitution = ctrl(async (req) => {
    const { reason } = req.body;
    if (!reason?.trim()) throw new Error('Se requiere un motivo para deshabilitar.');
    return svc.disableInstitution(req.params.id, reason, req.user.id, clientIp(req));
  });

  enableInstitution = ctrl(async (req) => {
    return svc.enableInstitution(req.params.id, req.user.id, clientIp(req));
  });

  // ── Users (global) ─────────────────────────────────────────────────────────

  listUsers = ctrl(async (req) => {
    const { page = 1, limit = 20, search = '', role, institutionId } = req.query;
    return svc.listUsers({
      page: +page, limit: Math.min(+limit, 100),
      search, role: role || null, institutionId: institutionId || null,
    });
  }, { ok: 200, fail: 500 });

  changeUserRole = ctrl(async (req) => {
    const { role } = req.body;
    if (!role) throw new Error('El campo role es requerido.');
    return svc.changeUserRole(req.params.userId, role, req.user.id, clientIp(req));
  });

  removeUser = ctrl(async (req) => {
    await svc.removeUserFromInstitution(req.params.userId, req.user.id, clientIp(req));
    return new OperationResult(true, 'Usuario removido de su institución.');
  });

  // ── Audit log ──────────────────────────────────────────────────────────────

  getAuditLog = ctrl(async (req) => {
    const { page = 1, limit = 50 } = req.query;
    return svc.getAuditLog({ page: +page, limit: Math.min(+limit, 200) });
  }, { ok: 200, fail: 500 });
}
