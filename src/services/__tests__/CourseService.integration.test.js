/**
 * CourseService integration tests — aligned with the current throw-based API.
 *
 * CourseService does NOT return OperationResult objects. It returns raw data
 * on success and THROWS on errors (access denied, not found, etc.).
 * These tests reflect the actual implementation in CourseService.js.
 */
import { jest } from '@jest/globals';
import CourseService from '../CourseService.js';

describe('CourseService Integration Tests', () => {
  let courseService;
  let mockCourseRepo;
  let mockEnrollmentRepo;

  const teacherId = 'teacher-uuid-001';
  const studentId = 'student-uuid-001';

  const baseCourse = {
    id: 'course-uuid-001',
    title: 'Ingeniería de Software',
    description: 'Fundamentos de ingeniería de software',
    teacher_id: teacherId,
    invite_code: 'ABC123',
  };

  beforeEach(() => {
    mockCourseRepo = {
      save: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByTeacher: jest.fn(),
      findByStudent: jest.fn(),
      findByInviteCode: jest.fn(),
    };

    mockEnrollmentRepo = {
      isEnrolled: jest.fn(),
      getCourseStudents: jest.fn(),
    };

    courseService = new CourseService(mockCourseRepo, mockEnrollmentRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createCourse ─────────────────────────────────────────────────────────────

  describe('createCourse', () => {
    it('creates a course and returns the saved record', async () => {
      mockCourseRepo.findByInviteCode.mockResolvedValue(null);
      mockCourseRepo.save.mockResolvedValue({ ...baseCourse });

      const result = await courseService.createCourse(
        { title: 'Ingeniería de Software', description: 'Desc' },
        teacherId
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Ingeniería de Software');
      expect(mockCourseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ teacher_id: teacherId, invite_code: expect.any(String) })
      );
    });

    it('retries invite code generation when code already exists', async () => {
      mockCourseRepo.findByInviteCode
        .mockResolvedValueOnce({ id: 'other' })  // first code exists
        .mockResolvedValueOnce(null);             // second is unique
      mockCourseRepo.save.mockResolvedValue(baseCourse);

      await courseService.createCourse({ title: 'Curso' }, teacherId);

      expect(mockCourseRepo.findByInviteCode).toHaveBeenCalledTimes(2);
    });
  });

  // ── getCoursesForUser ─────────────────────────────────────────────────────────

  describe('getCoursesForUser', () => {
    it('returns teacher courses with enrollment counts', async () => {
      mockCourseRepo.findByTeacher.mockResolvedValue([
        { ...baseCourse, enrollments: [{ count: 15 }] },
        { ...baseCourse, id: 'course-2', enrollments: [{ count: 5 }] },
      ]);

      const result = await courseService.getCoursesForUser(teacherId, 'teacher');

      expect(result).toHaveLength(2);
      expect(result[0].students).toBe(15);
      expect(result[1].students).toBe(5);
    });

    it('returns student courses from enrollments', async () => {
      mockCourseRepo.findByStudent.mockResolvedValue([
        {
          courses: { ...baseCourse, teacher: { name: 'Prof. García' } },
          enrolled_at: '2025-01-01',
        },
      ]);

      const result = await courseService.getCoursesForUser(studentId, 'student');

      expect(result).toHaveLength(1);
      expect(result[0].professor).toBe('Prof. García');
      expect(result[0].enrolled_at).toBe('2025-01-01');
    });
  });

  // ── getCourseDetail ───────────────────────────────────────────────────────────

  describe('getCourseDetail', () => {
    it('returns course detail for the owning teacher', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      const result = await courseService.getCourseDetail(baseCourse.id, teacherId, 'teacher');

      expect(result).toEqual(baseCourse);
      expect(mockEnrollmentRepo.isEnrolled).not.toHaveBeenCalled();
    });

    it('throws when a different teacher tries to access the course', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      await expect(
        courseService.getCourseDetail(baseCourse.id, 'other-teacher', 'teacher')
      ).rejects.toThrow(/permiso/i);
    });

    it('returns course for an enrolled student', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockEnrollmentRepo.isEnrolled.mockResolvedValue(true);

      const result = await courseService.getCourseDetail(baseCourse.id, studentId, 'student');

      expect(result).toEqual(baseCourse);
    });

    it('throws when a non-enrolled student tries to access the course', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockEnrollmentRepo.isEnrolled.mockResolvedValue(false);

      await expect(
        courseService.getCourseDetail(baseCourse.id, studentId, 'student')
      ).rejects.toThrow(/inscrito/i);
    });

    it('throws when the course does not exist', async () => {
      mockCourseRepo.getById.mockResolvedValue(null);

      await expect(
        courseService.getCourseDetail('non-existent', teacherId, 'teacher')
      ).rejects.toThrow(/no encontrado/i);
    });
  });

  // ── updateCourse ──────────────────────────────────────────────────────────────

  describe('updateCourse', () => {
    it('updates and returns the course when teacher owns it', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockCourseRepo.update.mockResolvedValue({ ...baseCourse, title: 'Nuevo Título' });

      const result = await courseService.updateCourse(baseCourse.id, { title: 'Nuevo Título' }, teacherId);

      expect(result.title).toBe('Nuevo Título');
    });

    it('throws when a different teacher tries to update', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      await expect(
        courseService.updateCourse(baseCourse.id, { title: 'X' }, 'other-teacher')
      ).rejects.toThrow(/permiso/i);
      expect(mockCourseRepo.update).not.toHaveBeenCalled();
    });

    it('throws when the course does not exist', async () => {
      mockCourseRepo.getById.mockResolvedValue(null);

      await expect(
        courseService.updateCourse('no-exist', { title: 'X' }, teacherId)
      ).rejects.toThrow(/no encontrado/i);
    });
  });

  // ── deleteCourse ──────────────────────────────────────────────────────────────

  describe('deleteCourse', () => {
    it('deletes the course when teacher owns it', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockCourseRepo.delete.mockResolvedValue(true);

      const result = await courseService.deleteCourse(baseCourse.id, teacherId);

      expect(result).toBe(true);
      expect(mockCourseRepo.delete).toHaveBeenCalledWith(baseCourse.id);
    });

    it('throws when a different teacher tries to delete', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      await expect(
        courseService.deleteCourse(baseCourse.id, 'other-teacher')
      ).rejects.toThrow(/permiso/i);
      expect(mockCourseRepo.delete).not.toHaveBeenCalled();
    });
  });

  // ── getCourseGrades ───────────────────────────────────────────────────────────

  describe('getCourseGrades', () => {
    it('returns grades array for the owning teacher', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockEnrollmentRepo.getCourseStudents.mockResolvedValue([
        { name: 'Ana García', email: 'ana@example.com', grade: 8.5, enrolled_at: '2025-01-01' },
        { name: 'Luis López', email: 'luis@example.com', grade: 9.0, enrolled_at: '2025-01-01' },
      ]);

      const result = await courseService.getCourseGrades(baseCourse.id, teacherId);

      expect(result).toHaveLength(2);
      expect(result[0].studentName).toBe('Ana García');
      expect(result[0].grade).toBe(8.5);
    });

    it('throws when a different teacher tries to get grades', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      await expect(
        courseService.getCourseGrades(baseCourse.id, 'other-teacher')
      ).rejects.toThrow(/permiso/i);
      expect(mockEnrollmentRepo.getCourseStudents).not.toHaveBeenCalled();
    });
  });
});
