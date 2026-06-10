import { jest } from "@jest/globals";
import { scoreWorkItem } from "../AdvisoryService.js";

describe("scoreWorkItem", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("returns null for overdue items", () => {
    expect(
      scoreWorkItem({ due_date: "2026-06-09T12:00:00Z", priority_id: 3 }, now)
    ).toBeNull();
  });

  it("scores nearer deadlines higher than distant ones", () => {
    const soon = scoreWorkItem(
      { due_date: "2026-06-11T12:00:00Z", priority_id: 2, complexity: 3, estimated_hours: 2 },
      now
    );
    const later = scoreWorkItem(
      { due_date: "2026-06-20T12:00:00Z", priority_id: 2, complexity: 3, estimated_hours: 2 },
      now
    );
    expect(soon.score).toBeGreaterThan(later.score);
  });

  it("includes complexity and estimated hours in output", () => {
    const item = scoreWorkItem(
      { due_date: "2026-06-12T12:00:00Z", priority_id: 3, complexity: 5, estimated_hours: 8 },
      now
    );
    expect(item.complexity).toBe(5);
    expect(item.estimated_hours).toBe(8);
    expect(item.score).toBeGreaterThan(0);
  });
});

describe("AdvisoryService.prioritizeWorkload", () => {
  const mockGetTasksForAi = jest.fn();
  const mockGetCoursesForUser = jest.fn();
  const mockGetAssignmentsByCourse = jest.fn();
  const mockGetSubmissions = jest.fn();

  beforeEach(() => {
    mockGetTasksForAi.mockReset();
    mockGetCoursesForUser.mockReset();
    mockGetAssignmentsByCourse.mockReset();
    mockGetSubmissions.mockReset();
  });

  it("excludes overdue tasks and unsubmitted assignments", async () => {
    mockGetTasksForAi.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          title: "Tarea próxima",
          due_date: "2026-06-15T12:00:00Z",
          priority_id: 3,
          complexity: 4,
          estimated_hours: 3,
        },
      ],
    });
    mockGetCoursesForUser.mockResolvedValue([{ id: 10, title: "Cálculo" }]);
    mockGetAssignmentsByCourse.mockResolvedValue([
      {
        id: 99,
        title: "Proyecto",
        due_date: "2026-06-18T12:00:00Z",
        complexity: 5,
        estimated_hours: 10,
      },
    ]);
    mockGetSubmissions.mockResolvedValue(null);

    const { default: AdvisoryService } = await import("../AdvisoryService.js");
    const service = new AdvisoryService(
      { getTasksForAi: mockGetTasksForAi },
      { getCoursesForUser: mockGetCoursesForUser },
      { getAssignmentsByCourse: mockGetAssignmentsByCourse },
      { getSubmissions: mockGetSubmissions }
    );
    const result = await service.prioritizeWorkload("user-1", { limit: 5 });

    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(2);
    expect(mockGetTasksForAi).toHaveBeenCalledWith(
      expect.objectContaining({ excludeOverdue: true }),
      expect.any(Object)
    );
  });
});
