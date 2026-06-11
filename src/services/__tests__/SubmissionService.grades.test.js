import { jest } from "@jest/globals";

const mockFindByCourse = jest.fn();
const mockGetById = jest.fn();
const mockFindByStudent = jest.fn();
const mockIsEnrolled = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.unstable_mockModule("../../repositories/SubmissionRepository.js", () => ({
  default: jest.fn(() => ({
    findByStudent: mockFindByStudent,
  })),
}));

jest.unstable_mockModule("../../repositories/AssignmentRepository.js", () => ({
  default: jest.fn(() => ({
    findByCourse: mockFindByCourse,
    getById: mockGetById,
  })),
}));

jest.unstable_mockModule("../../repositories/CourseRepository.js", () => ({
  default: jest.fn(() => ({
    getById: jest.fn().mockResolvedValue({ id: 10, title: "Cálculo" }),
  })),
}));

jest.unstable_mockModule("../../repositories/EnrollmentRepository.js", () => ({
  default: jest.fn(() => ({
    isEnrolled: mockIsEnrolled,
  })),
}));

jest.unstable_mockModule("../../repositories/AcademicGroupRepository.js", () => ({
  default: jest.fn(() => ({})),
}));

jest.unstable_mockModule("../../lib/supabaseAdmin.js", () => ({
  requireSupabaseClient: () => ({ from: mockSupabaseFrom }),
}));

const { default: SubmissionService } = await import("../SubmissionService.js");

describe("SubmissionService.getStudentGrades", () => {
  beforeEach(() => {
    mockFindByCourse.mockReset();
    mockFindByStudent.mockReset();
    mockSupabaseFrom.mockReset();
  });

  it("returns graded and ungraded submission rows for enrolled courses", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ course_id: 10 }],
          error: null,
        }),
      }),
    });

    mockFindByCourse.mockResolvedValue([
      { id: 1, title: "Parcial", due_date: "2026-06-01T00:00:00Z", is_group_assignment: false },
      { id: 2, title: "Taller", due_date: "2026-06-10T00:00:00Z", is_group_assignment: false },
    ]);

    mockGetById.mockImplementation(async (id) => ({
      id,
      title: id === 1 ? "Parcial" : "Taller",
      course_id: 10,
      is_group_assignment: false,
    }));

    mockFindByStudent
      .mockResolvedValueOnce({ graded: true, grade: 4.5, feedback: "Bien", submitted_at: "2026-05-01" })
      .mockResolvedValueOnce(null);

    const service = new SubmissionService();
    const rows = await service.getStudentGrades("user-1");

    expect(rows).toHaveLength(2);
    const parcial = rows.find((r) => r.assignment_id === 1);
    const taller = rows.find((r) => r.assignment_id === 2);
    expect(parcial.grade).toBe(4.5);
    expect(parcial.graded).toBe(true);
    expect(taller.submitted).toBe(false);
  });

  it("filters to graded_only rows when requested", async () => {
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ course_id: 10 }],
          error: null,
        }),
      }),
    });

    mockFindByCourse.mockResolvedValue([
      { id: 1, title: "Parcial", due_date: "2026-06-01T00:00:00Z", is_group_assignment: false },
    ]);

    mockGetById.mockResolvedValue({
      id: 1,
      title: "Parcial",
      course_id: 10,
      is_group_assignment: false,
    });

    mockFindByStudent.mockResolvedValue({ graded: true, grade: 3.8, feedback: null });

    const service = new SubmissionService();
    const rows = await service.getStudentGrades("user-1", { gradedOnly: true });

    expect(rows).toHaveLength(1);
    expect(rows[0].grade).toBe(3.8);
  });
});
