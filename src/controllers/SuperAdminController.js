import SuperAdminService from '../services/SuperAdminService.js';

const svc = new SuperAdminService();

/** Extract real IP from request (Vercel / Express) */
const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null;

export default class SuperAdminController {

  // ── Platform stats ─────────────────────────────────────────────────────────

  async getStats(req, res) {
    try {
      res.json(await svc.getPlatformStats());
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  // ── Institutions ───────────────────────────────────────────────────────────

  async listInstitutions(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      res.json(await svc.listInstitutions({
        page: +page, limit: Math.min(+limit, 100), search,
      }));
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async getInstitution(req, res) {
    try {
      res.json(await svc.getInstitutionDetail(req.params.id));
    } catch (e) { res.status(404).json({ error: e.message }); }
  }

  async updateInstitution(req, res) {
    try {
      const inst = await svc.updateInstitution(
        req.params.id, req.body, req.user.id, clientIp(req),
      );
      res.json(inst);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async disableInstitution(req, res) {
    try {
      const { reason } = req.body;
      if (!reason?.trim()) return res.status(400).json({ error: 'Se requiere un motivo para deshabilitar.' });
      const inst = await svc.disableInstitution(
        req.params.id, reason, req.user.id, clientIp(req),
      );
      res.json(inst);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async enableInstitution(req, res) {
    try {
      const inst = await svc.enableInstitution(req.params.id, req.user.id, clientIp(req));
      res.json(inst);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  // ── Users (global) ─────────────────────────────────────────────────────────

  async listUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = '', role, institutionId } = req.query;
      res.json(await svc.listUsers({
        page: +page, limit: Math.min(+limit, 100),
        search, role: role || null, institutionId: institutionId || null,
      }));
    } catch (e) { res.status(500).json({ error: e.message }); }
  }

  async changeUserRole(req, res) {
    try {
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'El campo role es requerido.' });
      const user = await svc.changeUserRole(
        req.params.userId, role, req.user.id, clientIp(req),
      );
      res.json(user);
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  async removeUser(req, res) {
    try {
      await svc.removeUserFromInstitution(req.params.userId, req.user.id, clientIp(req));
      res.json({ message: 'Usuario removido de su institución.' });
    } catch (e) { res.status(400).json({ error: e.message }); }
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async getAuditLog(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      res.json(await svc.getAuditLog({ page: +page, limit: Math.min(+limit, 200) }));
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
}
