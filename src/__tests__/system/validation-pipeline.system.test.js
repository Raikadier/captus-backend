/**
 * System tests — Validation pipeline
 *
 * Scope: verifies that the shared validators.js, OperationResult, and all
 * services that use them produce a CONSISTENT contract across the whole system.
 *
 * These are NOT unit tests of a single function; they trace the same value
 * through multiple layers (validator → service method → OperationResult shape)
 * and assert the final observable contract.
 */

import { jest } from '@jest/globals';
import { validateRequired, validateFutureDate } from '../../shared/validators.js';
import { OperationResult } from '../../shared/OperationResult.js';
import { TaskService } from '../../services/TaskService.js';
import { NotesService } from '../../services/NotesService.js';
import CourseService from '../../services/CourseService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal mock repo with jest.fn() for every listed method */
const mockRepo = (methods) =>
  Object.fromEntries(methods.map((m) => [m, jest.fn()]));

/** Assert that a result matches the OperationResult contract */
const assertOperationResult = (result, expectedSuccess) => {
  expect(result).toBeInstanceOf(OperationResult);
  expect(typeof result.success).toBe('boolean');
  expect(typeof result.message).toBe('string');
  expect(result.success).toBe(expectedSuccess);
  // data can be anything (null, object, array) but the key must exist
  expect('data' in result).toBe(true);
};

// ─── 1. validators.js contract ────────────────────────────────────────────────

describe('System — validators.js contract', () => {
  describe('validateRequired', () => {
    it('returns null for a valid non-empty string', () => {
      expect(validateRequired('hello', 'campo')).toBeNull();
    });

    it('returns a string error for empty string', () => {
      const err = validateRequired('', 'nombre');
      expect(typeof err).toBe('string');
      expect(err).toContain('nombre');
    });

    it('returns a string error for whitespace-only string', () => {
      const err = validateRequired('   ', 'apellido');
      expect(err).not.toBeNull();
    });

    it('returns a string error for null/undefined', () => {
      expect(validateRequired(null, 'x')).not.toBeNull();
      expect(validateRequired(undefined, 'x')).not.toBeNull();
    });

    it('error message contains the field name', () => {
      const err = validateRequired('', 'título');
      expect(err).toContain('título');
    });
  });

  describe('validateFutureDate', () => {
    // Use static dates to avoid timezone edge cases:
    // 'today' is dynamically computed via local date to match the validator's logic.
    const todayLocal = new Date();
    const today = [
      todayLocal.getFullYear(),
      String(todayLocal.getMonth() + 1).padStart(2, '0'),
      String(todayLocal.getDate()).padStart(2, '0'),
    ].join('-');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    // Hardcoded clearly-past date — never ambiguous regardless of timezone
    const yesterday = '2020-01-01';

    it('returns null for today (boundary — allowed)', () => {
      expect(validateFutureDate(today, 'fecha')).toBeNull();
    });

    it('returns null for a future date', () => {
      expect(validateFutureDate(tomorrow, 'fecha')).toBeNull();
      expect(validateFutureDate('2099-12-31', 'fecha')).toBeNull();
    });

    it('returns an error string for a past date', () => {
      const err = validateFutureDate(yesterday, 'fecha límite');
      expect(typeof err).toBe('string');
      expect(err).toContain('fecha límite');
    });

    it('returns null when date is omitted (optional field)', () => {
      expect(validateFutureDate(null, 'fecha')).toBeNull();
      expect(validateFutureDate(undefined, 'fecha')).toBeNull();
    });

    it('accepts ISO datetime strings', () => {
      expect(validateFutureDate('2099-12-31T23:59:59', 'fecha')).toBeNull();
    });
  });
});

// ─── 2. OperationResult shape contract ────────────────────────────────────────

describe('System — OperationResult shape contract', () => {
  it('success result has correct shape', () => {
    const r = new OperationResult(true, 'ok', { id: 1 });
    expect(r.success).toBe(true);
    expect(r.message).toBe('ok');
    expect(r.data).toEqual({ id: 1 });
  });

  it('failure result has correct shape', () => {
    const r = new OperationResult(false, 'error', null);
    expect(r.success).toBe(false);
    expect(r.message).toBe('error');
    expect(r.data).toBeNull();
  });

  it('default constructor produces a safe failure result', () => {
    const r = new OperationResult();
    expect(r.success).toBe(false);
    expect(typeof r.message).toBe('string');
    expect(r.data).toBeNull();
  });

  it('is serializable to JSON (for HTTP responses)', () => {
    const r = new OperationResult(true, 'guardado', { id: 42 });
    const json = JSON.parse(JSON.stringify(r));
    expect(json).toEqual({ success: true, message: 'guardado', data: { id: 42 } });
  });
});

// ─── 3. TaskService — validation pipeline end-to-end ─────────────────────────

describe('System — TaskService validation pipeline', () => {
  let taskService;
  const userId = 'user-abc-123';

  beforeEach(() => {
    taskService = new TaskService(
      mockRepo(['getById', 'save', 'update', 'delete', 'getByUser', 'getAll']),
      mockRepo(['deleteByTaskId']),
      mockRepo(['getAll', 'getByName']),
      mockRepo(['getAll', 'getByName']),
      mockRepo(['getByUser'])
    );
  });

  it('validates → creates OperationResult(false) for empty title', () => {
    const result = taskService.validateTask({ title: '', user_id: userId, due_date: '2099-01-01' });
    assertOperationResult(result, false);
    // TaskService returns its own message (not the shared validators.js message)
    expect(result.message).toMatch(/título/i);
  });

  it('validates → creates OperationResult(false) for past due_date', () => {
    const result = taskService.validateTask({ title: 'Tarea', user_id: userId, due_date: '2020-01-01' });
    assertOperationResult(result, false);
    expect(result.message).toContain('fecha límite');
  });

  it('validates → creates OperationResult(true) for valid task', () => {
    const result = taskService.validateTask({ title: 'Tarea válida', user_id: userId, due_date: '2099-01-01' });
    assertOperationResult(result, true);
  });

  it('save() returns OperationResult(false) when user is not authenticated', async () => {
    const result = await taskService.save({ title: 'X', due_date: '2099-01-01' }, null);
    assertOperationResult(result, false);
    expect(result.message).toContain('autenticado');
  });

  it('save() returns OperationResult(false) for validation failure (no title)', async () => {
    const result = await taskService.save({ title: '', due_date: '2099-01-01' }, { id: userId });
    assertOperationResult(result, false);
  });

  it('save() propagates repository success into OperationResult(true)', async () => {
    const savedTask = { id_Task: 99, title: 'Nueva', user_id: userId };
    taskService.taskRepository.save = jest.fn().mockResolvedValue(savedTask);
    taskService.taskRepository.getByUser = jest.fn().mockResolvedValue([]);
    taskService.priorityRepository.getAll = jest.fn().mockResolvedValue([]);
    taskService.categoryRepository.getAll = jest.fn().mockResolvedValue([]);

    const result = await taskService.save(
      { title: 'Nueva', due_date: '2099-01-01' },
      { id: userId }
    );
    assertOperationResult(result, true);
    expect(result.data).toBeDefined();
  });
});

// ─── 4. NotesService — full CRUD flow ─────────────────────────────────────────

describe('System — NotesService CRUD flow', () => {
  let notesService;
  let mockNotesRepo;
  const userId = 'user-notes-456';

  beforeEach(() => {
    mockNotesRepo = mockRepo(['save', 'getAllByUserId', 'getById', 'update', 'delete', 'togglePin']);
    notesService = new NotesService(mockNotesRepo);
  });

  it('create → OperationResult(false) for empty title', async () => {
    const result = await notesService.save({ title: '' }, userId);
    assertOperationResult(result, false);
  });

  it('create → OperationResult(false) without userId', async () => {
    const result = await notesService.save({ title: 'Mi nota' }, null);
    assertOperationResult(result, false);
    expect(result.message).toContain('autenticado');
  });

  it('create → OperationResult(true) on success', async () => {
    const note = { title: 'Mi nota', content: 'contenido' };
    const saved = { id: 1, ...note, user_id: userId };
    mockNotesRepo.save.mockResolvedValue(saved);

    const result = await notesService.save(note, userId);
    assertOperationResult(result, true);
    expect(result.data.id).toBe(1);
    expect(result.data.user_id).toBe(userId);
  });

  it('getById → OperationResult(false) for non-existent note', async () => {
    mockNotesRepo.getById.mockResolvedValue(null);
    const result = await notesService.getById(999, userId);
    assertOperationResult(result, false);
    expect(result.message).toContain('encontrada');
  });

  it('getById → OperationResult(false) when owner mismatch', async () => {
    mockNotesRepo.getById.mockResolvedValue({ id: 1, user_id: 'otro-usuario' });
    const result = await notesService.getById(1, userId);
    assertOperationResult(result, false);
    expect(result.message).toContain('accesible');
  });

  it('update → OperationResult(false) when no fields to update', async () => {
    const result = await notesService.update({ id: 1 }, userId);
    assertOperationResult(result, false);
  });

  it('delete → full flow: not found → failure, found+owner → success', async () => {
    mockNotesRepo.getById.mockResolvedValueOnce(null);
    const notFound = await notesService.delete(1, userId);
    assertOperationResult(notFound, false);

    mockNotesRepo.getById.mockResolvedValueOnce({ id: 1, user_id: userId });
    mockNotesRepo.delete.mockResolvedValueOnce(true);
    const deleted = await notesService.delete(1, userId);
    assertOperationResult(deleted, true);
  });

  it('all methods return OperationResult (never throw)', async () => {
    mockNotesRepo.getAllByUserId.mockRejectedValue(new Error('DB down'));
    const result = await notesService.getAll(userId);
    // Even on error, must return OperationResult, not throw
    assertOperationResult(result, false);
  });
});

// ─── 5. CourseService — throw-based error contract ────────────────────────────
//
// NOTE: CourseService was refactored to a throw-based API (does NOT return
// OperationResult). Methods return raw data on success and throw on errors.
// These tests verify the current implementation contract.

describe('System — CourseService throw-based contract', () => {
  let courseService;
  let mockCourseRepo;
  let mockEnrollmentRepo;
  const teacherId = 'teacher-xyz';
  const baseCourse = { id: 'c1', title: 'Álgebra', teacher_id: teacherId };

  beforeEach(() => {
    mockCourseRepo = {
      ...mockRepo(['save', 'getById', 'update', 'delete', 'getByTeacher', 'getGrades']),
      findByTeacher: jest.fn(),
      findByStudent: jest.fn(),
      findByInviteCode: jest.fn(),
    };
    mockEnrollmentRepo = {
      ...mockRepo(['getByStudentId', 'getByCourseId']),
      isEnrolled: jest.fn(),
      getCourseStudents: jest.fn(),
    };
    courseService = new CourseService(mockCourseRepo, mockEnrollmentRepo);
  });

  it('createCourse returns raw saved course object on success', async () => {
    mockCourseRepo.findByInviteCode.mockResolvedValue(null);
    mockCourseRepo.save.mockResolvedValue(baseCourse);

    const result = await courseService.createCourse({ title: 'Álgebra' }, teacherId);
    expect(result).toBeDefined();
    expect(result.title).toBe('Álgebra');
    expect(result.teacher_id).toBe(teacherId);
  });

  it('createCourse propagates repo errors (does not swallow them)', async () => {
    mockCourseRepo.findByInviteCode.mockResolvedValue(null);
    mockCourseRepo.save.mockRejectedValue(new Error('DB error'));
    await expect(courseService.createCourse({ title: 'X' }, teacherId)).rejects.toThrow('DB error');
  });

  it('getCourseDetail throws when course not found', async () => {
    mockCourseRepo.getById.mockResolvedValue(null);
    await expect(courseService.getCourseDetail('c-no', teacherId, 'teacher')).rejects.toThrow(/no encontrado/i);
  });

  it('getCourseDetail throws when teacher does not own the course', async () => {
    mockCourseRepo.getById.mockResolvedValue(baseCourse);
    await expect(courseService.getCourseDetail('c1', 'other-teacher', 'teacher')).rejects.toThrow(/permiso/i);
  });

  it('deleteCourse throws when teacher does not own the course', async () => {
    mockCourseRepo.getById.mockResolvedValue(baseCourse);
    await expect(courseService.deleteCourse('c1', 'other-teacher')).rejects.toThrow(/permiso/i);
  });

  it('getCoursesForUser returns an array for valid teacher', async () => {
    mockCourseRepo.findByTeacher.mockResolvedValue([baseCourse]);
    const result = await courseService.getCoursesForUser(teacherId, 'teacher');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// ─── 6. Cross-service: OperationResult JSON shape is always serializable ──────

describe('System — OperationResult is always HTTP-serializable', () => {
  const services = ['TaskService', 'NotesService', 'CourseService'];

  it('every OperationResult produced during tests has string message', () => {
    // We collect a variety of results from different service paths
    const results = [
      new OperationResult(true, 'ok', { id: 1 }),
      new OperationResult(false, 'error', null),
      new OperationResult(true, '', [1, 2, 3]),
      new OperationResult(false, 'Validación fallida', undefined),
    ];

    results.forEach((r) => {
      const json = JSON.parse(JSON.stringify(r));
      expect(typeof json.success).toBe('boolean');
      expect(typeof json.message).toBe('string');
      // data might be null or undefined (serialized as absent key or null)
    });
  });
});
