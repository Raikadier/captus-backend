import SuperAdminRepository from '../repositories/SuperAdminRepository.js';

const VALID_ROLES = ['student', 'teacher', 'admin', 'superadmin'];

export default class SuperAdminService {
  constructor() {
    this.repo = new SuperAdminRepository();
  }

  // ── Platform stats ─────────────────────────────────────────────────────────

  async getPlatformStats() {
    return this.repo.getPlatformStats();
  }

  // ── Institutions ───────────────────────────────────────────────────────────

  async listInstitutions(filters) {
    return this.repo.listInstitutions(filters);
  }

  async getInstitutionDetail(id) {
    const inst = await this.repo.getInstitutionDetail(id).catch(() => null);
    if (!inst) throw new Error('Institución no encontrada.');
    return inst;
  }

  async updateInstitution(id, data, actorId, ip) {
    await this._assertExists(id);
    const updated = await this.repo.updateInstitution(id, data);
    await this.repo.writeAuditLog({
      actorId, action: 'UPDATE_INSTITUTION', targetType: 'institution',
      targetId: id, payload: { changes: data }, ipAddress: ip,
    });
    return updated;
  }

  async disableInstitution(id, reason, actorId, ip) {
    await this._assertExists(id);
    const inst = await this.repo.setInstitutionActive(id, false, reason);
    await this.repo.writeAuditLog({
      actorId, action: 'DISABLE_INSTITUTION', targetType: 'institution',
      targetId: id, payload: { reason }, ipAddress: ip,
    });
    return inst;
  }

  async enableInstitution(id, actorId, ip) {
    await this._assertExists(id);
    const inst = await this.repo.setInstitutionActive(id, true);
    await this.repo.writeAuditLog({
      actorId, action: 'ENABLE_INSTITUTION', targetType: 'institution',
      targetId: id, payload: {}, ipAddress: ip,
    });
    return inst;
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(filters) {
    return this.repo.listUsers(filters);
  }

  async changeUserRole(userId, newRole, actorId, ip) {
    if (!VALID_ROLES.includes(newRole)) {
      throw new Error(`Rol inválido. Valores permitidos: ${VALID_ROLES.join(', ')}`);
    }
    const user = await this.repo.changeUserRole(userId, newRole);
    await this.repo.writeAuditLog({
      actorId, action: 'CHANGE_USER_ROLE', targetType: 'user',
      targetId: userId, payload: { newRole }, ipAddress: ip,
    });
    return user;
  }

  async removeUserFromInstitution(userId, actorId, ip) {
    const user = await this.repo.removeUserFromInstitution(userId);
    await this.repo.writeAuditLog({
      actorId, action: 'REMOVE_USER_FROM_INSTITUTION', targetType: 'user',
      targetId: userId, payload: {}, ipAddress: ip,
    });
    return user;
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async getAuditLog(filters) {
    return this.repo.getAuditLog(filters);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async _assertExists(institutionId) {
    const inst = await this.repo.getInstitutionDetail(institutionId).catch(() => null);
    if (!inst) throw new Error('Institución no encontrada.');
  }
}
