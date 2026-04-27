/**
 * Pruebas Unitarias — AdminService (Rol Admin Institucional)
 * Cubre los caminos principales de gestión de institución, usuarios y cursos.
 */
import { jest } from '@jest/globals';

// ─── Mocks ESM ───────────────────────────────────────────────────────────────

const mockFindByUser    = jest.fn();
const mockFindById      = jest.fn();
const mockSaveInst      = jest.fn();
const mockUpdateInst    = jest.fn();
const mockAssignUser    = jest.fn();
const mockSetUserRole   = jest.fn();
const mockGetMembers    = jest.fn();
const mockRemoveUser    = jest.fn();

const mockGradingFind   = jest.fn();
const mockGradingSave   = jest.fn();
const mockGradingDelete = jest.fn();
const mockGradingDefault = jest.fn();

const mockPeriodFind    = jest.fn();
const mockPeriodSave    = jest.fn();
const mockPeriodDelete  = jest.fn();
const mockPeriodActive  = jest.fn();

const mockCourseSave    = jest.fn();
const mockCourseGetById = jest.fn();

// Mock Supabase admin client
const mockSupabaseFrom = jest.fn();
const mockSupabase = { from: mockSupabaseFrom };

jest.unstable_mockModule('../../repositories/InstitutionRepository.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    findByUser:  mockFindByUser,
    findById:    mockFindById,
    save:        mockSaveInst,
    update:      mockUpdateInst,
    assignUser:  mockAssignUser,
    setUserRole: mockSetUserRole,
    getMembers:  mockGetMembers,
    removeUser:  mockRemoveUser,
    getCourses:  jest.fn().mockResolvedValue([]),
    assignCourseToInstitution: jest.fn().mockResolvedValue({}),
  })),
}));

jest.unstable_mockModule('../../repositories/GradingScaleRepository.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    findByInstitution: mockGradingFind,
    save:              mockGradingSave,
    delete:            mockGradingDelete,
    setDefault:        mockGradingDefault,
    findById:          jest.fn().mockResolvedValue({}),
    update:            jest.fn().mockResolvedValue({}),
  })),
}));

jest.unstable_mockModule('../../repositories/AcademicPeriodRepository.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    findByInstitution: mockPeriodFind,
    save:              mockPeriodSave,
    delete:            mockPeriodDelete,
    setActive:         mockPeriodActive,
    findById:          jest.fn().mockResolvedValue({}),
    update:            jest.fn().mockResolvedValue({}),
  })),
}));

jest.unstable_mockModule('../../repositories/CourseRepository.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    save:    mockCourseSave,
    getById: mockCourseGetById,
    findByInviteCode: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../repositories/EnrollmentRepository.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    isEnrolled: jest.fn(),
    save:       jest.fn(),
    getCourseStudents: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../lib/supabaseAdmin.js', () => ({
  requireSupabaseClient: () => mockSupabase,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

const AdminService = (await import('../AdminService.js')).default;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_ID   = 'admin-uuid-001';
const INST_ID    = 'inst-uuid-001';
const INST       = { id: INST_ID, name: 'Colegio San Marcos', created_by: ADMIN_ID };
const USER_ID    = 'user-uuid-002';
const USER_EMAIL = 'estudiante@test.com';
const USER       = { id: USER_ID, email: USER_EMAIL, name: 'Juan Perez', role: 'student', institution_id: null };

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService();
  });

  // ── Institution ─────────────────────────────────────────────────────────────

  describe('getMyInstitution', () => {
    it('returns the institution for the given admin', async () => {
      mockFindByUser.mockResolvedValue(INST);
      const result = await service.getMyInstitution(ADMIN_ID);
      expect(mockFindByUser).toHaveBeenCalledWith(ADMIN_ID);
      expect(result).toEqual(INST);
    });
  });

  describe('createInstitution', () => {
    it('creates institution, generates slug, and assigns creator as admin', async () => {
      mockSaveInst.mockResolvedValue({ ...INST });
      mockAssignUser.mockResolvedValue({});

      const data = { name: 'Colegio San Marcos' };
      const result = await service.createInstitution(data, ADMIN_ID);

      expect(mockSaveInst).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'colegio-san-marcos',
          created_by: ADMIN_ID,
        }),
      );
      expect(mockAssignUser).toHaveBeenCalledWith(ADMIN_ID, INST.id);
      expect(result.name).toBe('Colegio San Marcos');
    });
  });

  describe('updateInstitution', () => {
    it('updates institution when admin is the owner', async () => {
      mockFindById.mockResolvedValue(INST);
      mockUpdateInst.mockResolvedValue({ ...INST, name: 'Nuevo Nombre' });

      const result = await service.updateInstitution(INST_ID, { name: 'Nuevo Nombre' }, ADMIN_ID);
      expect(result.name).toBe('Nuevo Nombre');
    });

    it('throws when institution does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.updateInstitution(INST_ID, {}, ADMIN_ID))
        .rejects.toThrow('Institución no encontrada');
    });

    it('throws when admin is not the owner', async () => {
      mockFindById.mockResolvedValue({ ...INST, created_by: 'other-admin' });
      await expect(service.updateInstitution(INST_ID, {}, ADMIN_ID))
        .rejects.toThrow('No autorizado');
    });
  });

  // ── Users ────────────────────────────────────────────────────────────────────

  describe('getMembers', () => {
    it('returns members filtered by role', async () => {
      const students = [USER];
      mockGetMembers.mockResolvedValue(students);

      const result = await service.getMembers(INST_ID, 'student');
      expect(mockGetMembers).toHaveBeenCalledWith(INST_ID, 'student');
      expect(result).toEqual(students);
    });
  });

  describe('inviteUserByEmail', () => {
    const mockSelect = { eq: jest.fn() };
    const mockEqChain = { single: jest.fn() };

    beforeEach(() => {
      mockSupabaseFrom.mockReturnValue({ select: jest.fn().mockReturnValue(mockSelect) });
      mockSelect.eq.mockReturnValue(mockEqChain);
    });

    it('invites an existing user to the institution', async () => {
      mockEqChain.single.mockResolvedValue({ data: USER, error: null });
      mockAssignUser.mockResolvedValue({});
      mockSetUserRole.mockResolvedValue({});

      const result = await service.inviteUserByEmail(USER_EMAIL, INST_ID, 'student');
      expect(mockAssignUser).toHaveBeenCalledWith(USER_ID, INST_ID);
      expect(mockSetUserRole).toHaveBeenCalledWith(USER_ID, 'student');
      expect(result.email).toBe(USER_EMAIL);
    });

    it('throws when user is not found', async () => {
      mockEqChain.single.mockResolvedValue({ data: null, error: new Error('not found') });
      await expect(service.inviteUserByEmail('noexiste@test.com', INST_ID, 'student'))
        .rejects.toThrow('Usuario no encontrado');
    });

    it('throws when user belongs to another institution', async () => {
      const userOtherInst = { ...USER, institution_id: 'other-inst' };
      mockEqChain.single.mockResolvedValue({ data: userOtherInst, error: null });
      await expect(service.inviteUserByEmail(USER_EMAIL, INST_ID, 'student'))
        .rejects.toThrow('ya pertenece a otra institución');
    });
  });

  // ── Grading scales ───────────────────────────────────────────────────────────

  describe('getGradingScales', () => {
    it('returns grading scales for the institution', async () => {
      const scales = [{ id: 'gs-1', name: 'Escala 1-10' }];
      mockGradingFind.mockResolvedValue(scales);
      const result = await service.getGradingScales(INST_ID);
      expect(mockGradingFind).toHaveBeenCalledWith(INST_ID);
      expect(result).toEqual(scales);
    });
  });

  describe('createGradingScale', () => {
    it('creates a grading scale with institution_id', async () => {
      const scale = { id: 'gs-1', name: 'Escala numérica', institution_id: INST_ID };
      mockGradingSave.mockResolvedValue(scale);

      const result = await service.createGradingScale({ name: 'Escala numérica' }, INST_ID);
      expect(mockGradingSave).toHaveBeenCalledWith(
        expect.objectContaining({ institution_id: INST_ID }),
      );
      expect(result).toEqual(scale);
    });
  });

  // ── Academic periods ─────────────────────────────────────────────────────────

  describe('getPeriods', () => {
    it('returns academic periods for the institution', async () => {
      const periods = [{ id: 'p-1', name: 'Semestre I 2025' }];
      mockPeriodFind.mockResolvedValue(periods);
      const result = await service.getPeriods(INST_ID);
      expect(mockPeriodFind).toHaveBeenCalledWith(INST_ID);
      expect(result).toEqual(periods);
    });
  });

  describe('createPeriod', () => {
    it('creates a period with institution_id', async () => {
      const period = { id: 'p-1', name: 'Semestre I', institution_id: INST_ID };
      mockPeriodSave.mockResolvedValue(period);

      const result = await service.createPeriod({ name: 'Semestre I' }, INST_ID);
      expect(mockPeriodSave).toHaveBeenCalledWith(
        expect.objectContaining({ institution_id: INST_ID }),
      );
      expect(result).toEqual(period);
    });
  });
});
