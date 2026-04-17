import { jest } from '@jest/globals';
import CourseService from '../CourseService.js';
import { OperationResult } from '../../shared/OperationResult.js';

/**
 * Integration tests for CourseService
 * Tests the complete course lifecycle including:
 * - Course creation with invite code generation
 * - Course retrieval for teachers and students
 * - Course detail access control
 * - Course update and delete with permission checks
 * - Grade retrieval
 */
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

  // =========================================================================
  // COURSE CREATION
  // =========================================================================
  describe('createCourse', () => {
    it('should create a course successfully and generate an invite code', async () => {
      mockCourseRepo.findByInviteCode.mockResolvedValue(null); // invite code is unique
      mockCourseRepo.save.mockResolvedValue({ ...baseCourse });

      const result = await courseService.createCourse(
        { title: 'Ingeniería de Software', description: 'Desc' },
        teacherId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockCourseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ teacher_id: teacherId, invite_code: expect.any(String) })
      );
    });

    it('should fail if title is missing', async () => {
      const result = await courseService.createCourse({ description: 'Desc' }, teacherId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('título');
      expect(mockCourseRepo.save).not.toHaveBeenCalled();
    });

    it('should fail if title is empty string', async () => {
      const result = await courseService.createCourse({ title: '  ' }, teacherId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('título');
    });

    it('should fail if teacherId is missing', async () => {
      const result = await courseService.createCourse({ title: 'Curso' }, null);

      expect(result.success).toBe(false);
      expect(result.message).toContain('profesor');
    });

    it('should retry if generated invite code already exists', async () => {
      // First call returns existing code, second returns null (unique)
      mockCourseRepo.findByInviteCode
        .mockResolvedValueOnce({ id: 'other-course' })
        .mockResolvedValueOnce(null);
      mockCourseRepo.save.mockResolvedValue(baseCourse);

      const result = await courseService.createCourse({ title: 'Curso' }, teacherId);

      expect(result.success).toBe(true);
      expect(mockCourseRepo.findByInviteCode).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // COURSE RETRIEVAL
  // =========================================================================
  describe('getCoursesForUser', () => {
    it('should return teacher courses with enrollment count', async () => {
      const mockCourses = [
        { ...baseCourse, enrollments: [{ count: 15 }] },
        { ...baseCourse, id: 'course-2', title: 'Otro Curso', enrollments: [{ count: 5 }] },
      ];
      mockCourseRepo.findByTeacher.mockResolvedValue(mockCourses);

      const result = await courseService.getCoursesForUser(teacherId, 'teacher');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].students).toBe(15);
      expect(result.data[1].students).toBe(5);
    });

    it('should return student courses from enrollments', async () => {
      const mockEnrollments = [
        {
          courses: { ...baseCourse, teacher: { name: 'Prof. García' } },
          enrolled_at: '2025-01-01',
        },
      ];
      mockCourseRepo.findByStudent.mockResolvedValue(mockEnrollments);

      const result = await courseService.getCoursesForUser(studentId, 'student');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].professor).toBe('Prof. García');
      expect(result.data[0].enrolled_at).toBe('2025-01-01');
    });

    it('should fail if userId is missing', async () => {
      const result = await courseService.getCoursesForUser(null, 'student');

      expect(result.success).toBe(false);
      expect(mockCourseRepo.findByStudent).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // COURSE DETAIL ACCESS CONTROL
  // =========================================================================
  describe('getCourseDetail', () => {
    it('should return course detail for the owning teacher', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      const result = await courseService.getCourseDetail(baseCourse.id, teacherId, 'teacher');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(baseCourse);
      expect(mockEnrollmentRepo.isEnrolled).not.toHaveBeenCalled();
    });

    it('should deny teacher access to another teacher\'s course', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      const result = await courseService.getCourseDetail(baseCourse.id, 'other-teacher', 'teacher');

      expect(result.success).toBe(false);
      expect(result.message).toContain('permiso');
    });

    it('should return course detail for enrolled student', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockEnrollmentRepo.isEnrolled.mockResolvedValue(true);

      const result = await courseService.getCourseDetail(baseCourse.id, studentId, 'student');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(baseCourse);
    });

    it('should deny access to non-enrolled student', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockEnrollmentRepo.isEnrolled.mockResolvedValue(false);

      const result = await courseService.getCourseDetail(baseCourse.id, studentId, 'student');

      expect(result.success).toBe(false);
      expect(result.message).toContain('inscrito');
    });

    it('should return failure if course does not exist', async () => {
      mockCourseRepo.getById.mockResolvedValue(null);

      const result = await courseService.getCourseDetail('non-existent', teacherId, 'teacher');

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrado');
    });
  });

  // =========================================================================
  // COURSE UPDATE
  // =========================================================================
  describe('updateCourse', () => {
    it('should update course successfully if teacher owns it', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockCourseRepo.update.mockResolvedValue({ ...baseCourse, title: 'Nuevo Título' });

      const result = await courseService.updateCourse(baseCourse.id, { title: 'Nuevo Título' }, teacherId);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Nuevo Título');
    });

    it('should deny update if teacher does not own the course', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      const result = await courseService.updateCourse(baseCourse.id, { title: 'X' }, 'other-teacher');

      expect(result.success).toBe(false);
      expect(result.message).toContain('permiso');
      expect(mockCourseRepo.update).not.toHaveBeenCalled();
    });

    it('should fail if course does not exist', async () => {
      mockCourseRepo.getById.mockResolvedValue(null);

      const result = await courseService.updateCourse('no-exist', { title: 'X' }, teacherId);

      expect(result.success).toBe(false);
      expect(mockCourseRepo.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // COURSE DELETE
  // =========================================================================
  describe('deleteCourse', () => {
    it('should delete course successfully if teacher owns it', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockCourseRepo.delete.mockResolvedValue(true);

      const result = await courseService.deleteCourse(baseCourse.id, teacherId);

      expect(result.success).toBe(true);
      expect(mockCourseRepo.delete).toHaveBeenCalledWith(baseCourse.id);
    });

    it('should deny delete if teacher does not own the course', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      const result = await courseService.deleteCourse(baseCourse.id, 'other-teacher');

      expect(result.success).toBe(false);
      expect(mockCourseRepo.delete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GRADE RETRIEVAL
  // =========================================================================
  describe('getCourseGrades', () => {
    it('should return grades for owning teacher', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);
      mockEnrollmentRepo.getCourseStudents.mockResolvedValue([
        { name: 'Ana García', email: 'ana@example.com', grade: 8.5, enrolled_at: '2025-01-01' },
        { name: 'Luis López', email: 'luis@example.com', grade: 9.0, enrolled_at: '2025-01-01' },
      ]);

      const result = await courseService.getCourseGrades(baseCourse.id, teacherId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].studentName).toBe('Ana García');
      expect(result.data[0].grade).toBe(8.5);
    });

    it('should deny grade access if teacher does not own course', async () => {
      mockCourseRepo.getById.mockResolvedValue(baseCourse);

      const result = await courseService.getCourseGrades(baseCourse.id, 'other-teacher');

      expect(result.success).toBe(false);
      expect(mockEnrollmentRepo.getCourseStudents).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // OPERATIONRESULT SHAPE VALIDATION
  // =========================================================================
  describe('OperationResult shape consistency', () => {
    it('all methods should return { success, message, data } shape', async () => {
      mockCourseRepo.findByTeacher.mockResolvedValue([]);

      const result = await courseService.getCoursesForUser(teacherId, 'teacher');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
    });
  });
});
