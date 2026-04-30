import { jest } from '@jest/globals';

// ── Mock the repository ──────────────────────────────────────────────────────
const mockRepo = {
  getPlatformStats:          jest.fn(),
  listInstitutions:          jest.fn(),
  getInstitutionDetail:      jest.fn(),
  updateInstitution:         jest.fn(),
  setInstitutionActive:      jest.fn(),
  listUsers:                 jest.fn(),
  changeUserRole:            jest.fn(),
  removeUserFromInstitution: jest.fn(),
  getAuditLog:               jest.fn(),
  writeAuditLog:             jest.fn(),
};

jest.unstable_mockModule('../../repositories/SuperAdminRepository.js', () => ({
  default: jest.fn(() => mockRepo),
}));

const { default: SuperAdminService } = await import('../../services/SuperAdminService.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
const ACTOR  = 'actor-uuid';
const IP     = '127.0.0.1';
const INST   = { id: 'inst-1', name: 'Test Inst', is_active: true, stats: {} };

beforeEach(() => jest.clearAllMocks());

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SuperAdminService.getPlatformStats', () => {
  it('delegates to repo', async () => {
    mockRepo.getPlatformStats.mockResolvedValue({ institutions: { total: 3 } });
    const svc = new SuperAdminService();
    const res = await svc.getPlatformStats();
    expect(res.institutions.total).toBe(3);
    expect(mockRepo.getPlatformStats).toHaveBeenCalledTimes(1);
  });
});

describe('SuperAdminService.listInstitutions', () => {
  it('passes filters to repo', async () => {
    mockRepo.listInstitutions.mockResolvedValue({ data: [], total: 0 });
    const svc = new SuperAdminService();
    await svc.listInstitutions({ page: 2, limit: 10, search: 'foo' });
    expect(mockRepo.listInstitutions).toHaveBeenCalledWith({ page: 2, limit: 10, search: 'foo' });
  });
});

describe('SuperAdminService.getInstitutionDetail', () => {
  it('returns institution when found', async () => {
    mockRepo.getInstitutionDetail.mockResolvedValue(INST);
    const svc = new SuperAdminService();
    const res = await svc.getInstitutionDetail('inst-1');
    expect(res.id).toBe('inst-1');
  });

  it('throws when institution not found', async () => {
    mockRepo.getInstitutionDetail.mockRejectedValue(new Error('not found'));
    const svc = new SuperAdminService();
    await expect(svc.getInstitutionDetail('bad-id')).rejects.toThrow('Institución no encontrada.');
  });
});

describe('SuperAdminService.updateInstitution', () => {
  it('updates and writes audit log', async () => {
    mockRepo.getInstitutionDetail.mockResolvedValue(INST);
    mockRepo.updateInstitution.mockResolvedValue({ ...INST, name: 'Nuevo' });
    const svc = new SuperAdminService();
    const res = await svc.updateInstitution('inst-1', { name: 'Nuevo' }, ACTOR, IP);
    expect(res.name).toBe('Nuevo');
    expect(mockRepo.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE_INSTITUTION', actorId: ACTOR }),
    );
  });
});

describe('SuperAdminService.disableInstitution', () => {
  it('disables and writes audit log', async () => {
    mockRepo.getInstitutionDetail.mockResolvedValue(INST);
    mockRepo.setInstitutionActive.mockResolvedValue({ ...INST, is_active: false });
    const svc = new SuperAdminService();
    const res = await svc.disableInstitution('inst-1', 'Impago', ACTOR, IP);
    expect(res.is_active).toBe(false);
    expect(mockRepo.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DISABLE_INSTITUTION', payload: { reason: 'Impago' } }),
    );
  });
});

describe('SuperAdminService.enableInstitution', () => {
  it('enables and writes audit log', async () => {
    mockRepo.getInstitutionDetail.mockResolvedValue({ ...INST, is_active: false });
    mockRepo.setInstitutionActive.mockResolvedValue({ ...INST, is_active: true });
    const svc = new SuperAdminService();
    const res = await svc.enableInstitution('inst-1', ACTOR, IP);
    expect(res.is_active).toBe(true);
    expect(mockRepo.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ENABLE_INSTITUTION' }),
    );
  });
});

describe('SuperAdminService.changeUserRole', () => {
  it('accepts valid role and writes audit log', async () => {
    mockRepo.changeUserRole.mockResolvedValue({ id: 'u1', role: 'teacher' });
    const svc = new SuperAdminService();
    const res = await svc.changeUserRole('u1', 'teacher', ACTOR, IP);
    expect(res.role).toBe('teacher');
    expect(mockRepo.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CHANGE_USER_ROLE' }),
    );
  });

  it('throws on invalid role', async () => {
    const svc = new SuperAdminService();
    await expect(svc.changeUserRole('u1', 'god', ACTOR, IP)).rejects.toThrow('Rol inválido');
  });

  it('accepts superadmin as a valid role', async () => {
    mockRepo.changeUserRole.mockResolvedValue({ id: 'u1', role: 'superadmin' });
    const svc = new SuperAdminService();
    const res = await svc.changeUserRole('u1', 'superadmin', ACTOR, IP);
    expect(res.role).toBe('superadmin');
  });
});

describe('SuperAdminService.removeUserFromInstitution', () => {
  it('removes user and writes audit log', async () => {
    mockRepo.removeUserFromInstitution.mockResolvedValue({ id: 'u1' });
    const svc = new SuperAdminService();
    await svc.removeUserFromInstitution('u1', ACTOR, IP);
    expect(mockRepo.removeUserFromInstitution).toHaveBeenCalledWith('u1');
    expect(mockRepo.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REMOVE_USER_FROM_INSTITUTION', targetId: 'u1' }),
    );
  });
});
