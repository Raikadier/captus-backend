/**
 * Tests for src/ai/context.js — fetchContextForIntent
 *
 * Each intent is isolated by mocking the service layer.
 * The test verifies which service is called and what shape is returned.
 */

import { jest } from "@jest/globals";
import { OperationResult } from "../../shared/OperationResult.js";

// ── Service mocks ─────────────────────────────────────────────────────────────

const mockGetTasksForAi = jest.fn();
const mockNotesGetAll = jest.fn();
const mockEventsGetUpcoming = jest.fn();
const mockGetCoursesForUser = jest.fn();

jest.unstable_mockModule("../../services/TaskService.js", () => ({
  TaskService: jest.fn(() => ({ getTasksForAi: mockGetTasksForAi })),
}));

jest.unstable_mockModule("../../services/NotesService.js", () => ({
  NotesService: jest.fn(() => ({ getAll: mockNotesGetAll })),
}));

// EventsService requires EventsRepository injection — mock both
jest.unstable_mockModule("../../repositories/EventsRepository.js", () => ({
  default: jest.fn(() => ({})),
}));

jest.unstable_mockModule("../../services/EventsService.js", () => ({
  EventsService: jest.fn(() => ({ getUpcoming: mockEventsGetUpcoming })),
}));

jest.unstable_mockModule("../../services/CourseService.js", () => ({
  default: jest.fn(() => ({ getCoursesForUser: mockGetCoursesForUser })),
}));

// Import after all mocks are registered
const { fetchContextForIntent } = await import("../context.js");

const USER_ID = "user-abc";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ok = (data) => new OperationResult(true, "ok", data);
const fail = () => new OperationResult(false, "error");

// ── tasks intent ─────────────────────────────────────────────────────────────

describe("fetchContextForIntent — tasks", () => {
  beforeEach(() => mockGetTasksForAi.mockReset());

  it("fetches tasks and returns formatted string", async () => {
    mockGetTasksForAi.mockResolvedValueOnce(
      ok([
        { id: 1, title: "Entrega parcial", due_date: "2026-06-01T00:00:00Z", completed: false },
        { id: 2, title: "Leer capítulo 5", due_date: null, completed: true },
      ])
    );

    const result = await fetchContextForIntent("tasks", USER_ID);
    expect(typeof result).toBe("string");
    expect(result).toContain("[1]");
    expect(result).toContain("Entrega parcial");
    expect(result).toContain("[2]");
    expect(result).toContain("Leer capítulo 5");
    expect(mockGetTasksForAi).toHaveBeenCalledWith(
      { includeCompleted: false, limit: 10 },
      { id: USER_ID }
    );
  });

  it("returns empty-list message when user has no tasks", async () => {
    mockGetTasksForAi.mockResolvedValueOnce(ok([]));
    const result = await fetchContextForIntent("tasks", USER_ID);
    expect(result).toContain("no tiene tareas pendientes");
  });

  it("returns error string when task service fails", async () => {
    mockGetTasksForAi.mockResolvedValueOnce(fail());
    const result = await fetchContextForIntent("tasks", USER_ID);
    expect(result).toContain("Error cargando tareas");
  });

  it("returns null when service throws (no propagation)", async () => {
    mockGetTasksForAi.mockRejectedValueOnce(new Error("DB down"));
    const result = await fetchContextForIntent("tasks", USER_ID);
    expect(result).toBeNull();
  });
});

// ── notes intent ─────────────────────────────────────────────────────────────

describe("fetchContextForIntent — notes", () => {
  beforeEach(() => mockNotesGetAll.mockReset());

  it("fetches notes and returns formatted string", async () => {
    mockNotesGetAll.mockResolvedValueOnce(
      ok([
        { id: 10, title: "Álgebra lineal", is_pinned: true },
        { id: 11, title: "Física cuántica", is_pinned: false },
      ])
    );

    const result = await fetchContextForIntent("notes", USER_ID);
    expect(result).toContain("[10]");
    expect(result).toContain("Álgebra lineal");
    expect(mockNotesGetAll).toHaveBeenCalledWith({ id: USER_ID });
  });

  it("returns empty message when user has no notes", async () => {
    mockNotesGetAll.mockResolvedValueOnce(ok([]));
    const result = await fetchContextForIntent("notes", USER_ID);
    expect(result).toContain("no tiene notas");
  });

  it("returns null when service throws", async () => {
    mockNotesGetAll.mockRejectedValueOnce(new Error("timeout"));
    const result = await fetchContextForIntent("notes", USER_ID);
    expect(result).toBeNull();
  });
});

// ── events intent ─────────────────────────────────────────────────────────────

describe("fetchContextForIntent — events", () => {
  beforeEach(() => mockEventsGetUpcoming.mockReset());

  it("fetches upcoming events and returns formatted string", async () => {
    mockEventsGetUpcoming.mockResolvedValueOnce(
      ok([
        { id: 20, title: "Parcial Cálculo", start_date: "2026-06-10T09:00:00Z" },
      ])
    );

    const result = await fetchContextForIntent("events", USER_ID);
    expect(result).toContain("[20]");
    expect(result).toContain("Parcial Cálculo");
    expect(mockEventsGetUpcoming).toHaveBeenCalledWith({ limit: 5 }, { id: USER_ID });
  });

  it("returns empty message when no upcoming events", async () => {
    mockEventsGetUpcoming.mockResolvedValueOnce(ok([]));
    const result = await fetchContextForIntent("events", USER_ID);
    expect(result).toContain("No hay eventos próximos");
  });

  it("returns null when service throws", async () => {
    mockEventsGetUpcoming.mockRejectedValueOnce(new Error("network error"));
    const result = await fetchContextForIntent("events", USER_ID);
    expect(result).toBeNull();
  });
});

// ── study / general intent ────────────────────────────────────────────────────

describe("fetchContextForIntent — study and general", () => {
  it("returns null for 'study' intent (content sent inline by client)", async () => {
    const result = await fetchContextForIntent("study", USER_ID);
    expect(result).toBeNull();
  });

  it("returns null for 'general' intent (falls through to default)", async () => {
    const result = await fetchContextForIntent("general", USER_ID);
    expect(result).toBeNull();
  });

  it("returns null for 'notifications' intent", async () => {
    const result = await fetchContextForIntent("notifications", USER_ID);
    expect(result).toBeNull();
  });
});

// ── teacher intents ───────────────────────────────────────────────────────────

describe("fetchContextForIntent — teacher_analytics", () => {
  beforeEach(() => mockGetCoursesForUser.mockReset());

  it("returns course list string for teacher role", async () => {
    mockGetCoursesForUser.mockResolvedValueOnce([
      { id: 100, title: "Estructuras de Datos", invite_code: "ED2026" },
    ]);

    const result = await fetchContextForIntent("teacher_analytics", USER_ID, "teacher");
    expect(result).toContain("CURSOS DEL DOCENTE");
    expect(result).toContain("[100]");
    expect(result).toContain("Estructuras de Datos");
  });

  it("returns null for student role (non-teacher)", async () => {
    const result = await fetchContextForIntent("teacher_analytics", USER_ID, "student");
    expect(result).toBeNull();
  });

  it("returns empty message when teacher has no courses", async () => {
    mockGetCoursesForUser.mockResolvedValueOnce([]);
    const result = await fetchContextForIntent("teacher_analytics", USER_ID, "teacher");
    expect(result).toContain("no tiene cursos activos");
  });

  it("returns null when service throws", async () => {
    mockGetCoursesForUser.mockRejectedValueOnce(new Error("DB error"));
    const result = await fetchContextForIntent("teacher_analytics", USER_ID, "teacher");
    expect(result).toBeNull();
  });
});

describe("fetchContextForIntent — teacher_content", () => {
  beforeEach(() => mockGetCoursesForUser.mockReset());

  it("returns course list string for teacher role", async () => {
    mockGetCoursesForUser.mockResolvedValueOnce([
      { id: 200, title: "Programación I", invite_code: "P12026" },
    ]);

    const result = await fetchContextForIntent("teacher_content", USER_ID, "teacher");
    expect(result).toContain("CURSOS DEL DOCENTE");
    expect(result).toContain("Programación I");
  });

  it("returns null for non-teacher role", async () => {
    const result = await fetchContextForIntent("teacher_content", USER_ID, "student");
    expect(result).toBeNull();
  });
});

// ── missing userId ────────────────────────────────────────────────────────────

describe("fetchContextForIntent — missing userId", () => {
  it("returns null immediately when userId is null", async () => {
    const result = await fetchContextForIntent("tasks", null);
    expect(result).toBeNull();
  });

  it("returns null immediately when userId is empty string", async () => {
    const result = await fetchContextForIntent("notes", "");
    expect(result).toBeNull();
  });

  it("returns null immediately when userId is undefined", async () => {
    const result = await fetchContextForIntent("events", undefined);
    expect(result).toBeNull();
  });
});
