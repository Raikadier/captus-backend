import { jest } from '@jest/globals';

// Create mock functions first
const mockLte = jest.fn().mockReturnThis();
const mockGte = jest.fn();
const mockSelect = jest.fn().mockReturnValue({ lte: mockLte, gte: mockGte });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

// Mock the module using unstable_mockModule
jest.unstable_mockModule('../../src/lib/supabaseAdmin.js', () => ({
    requireSupabaseClient: () => ({
        from: mockFrom,
    })
}));

describe("AssignmentRepository Deadline Check", () => {
  it("Debe seleccionar tareas con <= 3 días de vencimiento", async () => {
    // Dynamic import after mock
    const { default: AssignmentRepository } = await import("../../src/repositories/AssignmentRepository.js");

    const mockAssignments = [
      { id: 1, due_date: new Date(Date.now() + 2 * 86400000).toISOString() },
    ];

    // Configure the mock return value
    mockGte.mockResolvedValue({ data: mockAssignments, error: null });

    const assignmentRepo = new AssignmentRepository();
    const results = await assignmentRepo.getUpcomingDeadlines();

    expect(results).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('course_assignments');
  });
});
