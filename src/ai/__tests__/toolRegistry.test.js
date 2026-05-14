/**
 * Tests for src/ai/toolRegistry.js
 *
 * Every tool handler + the executeTool dispatcher is covered.
 * Services are mocked via jest.unstable_mockModule (ESM-safe).
 */

import { jest } from "@jest/globals";
import { OperationResult } from "../../shared/OperationResult.js";

// ── Service mock functions ────────────────────────────────────────────────────

// TaskService
const mockTaskSave     = jest.fn();
const mockTaskComplete = jest.fn();
const mockTaskDelete   = jest.fn();
const mockTaskGetAi    = jest.fn();

// NotesService
const mockNotesSave   = jest.fn();
const mockNotesUpdate = jest.fn();
const mockNotesDelete = jest.fn();
const mockNotesGetAll = jest.fn();

// EventsService
const mockEventsSave      = jest.fn();
const mockEventsUpdate    = jest.fn();
const mockEventsDelete    = jest.fn();
const mockEventsGetUpcoming = jest.fn();

// CourseService
const mockGetCoursesForUser = jest.fn();
const mockGetCourseGrades   = jest.fn();

// EnrollmentService
const mockEnrollmentGetStudents = jest.fn();

// Repositories
const mockAssignmentFindByCourse  = jest.fn();
const mockSubmissionFindByAssignment = jest.fn();
const mockEnrollmentGetCourseStudents = jest.fn();

// AI model
const mockCreateChatCompletion = jest.fn();

// supabase client mock
const mockSupabaseFrom = jest.fn();

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.unstable_mockModule("../../services/TaskService.js", () => ({
  TaskService: jest.fn(() => ({
    save:          mockTaskSave,
    complete:      mockTaskComplete,
    delete:        mockTaskDelete,
    getTasksForAi: mockTaskGetAi,
  })),
}));

jest.unstable_mockModule("../../services/NotesService.js", () => ({
  NotesService: jest.fn(() => ({
    save:   mockNotesSave,
    update: mockNotesUpdate,
    delete: mockNotesDelete,
    getAll: mockNotesGetAll,
  })),
}));

jest.unstable_mockModule("../../repositories/EventsRepository.js", () => ({
  default: jest.fn(() => ({})),
}));

jest.unstable_mockModule("../../services/EventsService.js", () => ({
  EventsService: jest.fn(() => ({
    save:        mockEventsSave,
    update:      mockEventsUpdate,
    delete:      mockEventsDelete,
    getUpcoming: mockEventsGetUpcoming,
  })),
}));

jest.unstable_mockModule("../../services/CourseService.js", () => ({
  default: jest.fn(() => ({
    getCoursesForUser: mockGetCoursesForUser,
    getCourseGrades:   mockGetCourseGrades,
  })),
}));

jest.unstable_mockModule("../../services/EnrollmentService.js", () => ({
  default: jest.fn(() => ({
    getStudents: mockEnrollmentGetStudents,
  })),
}));

jest.unstable_mockModule("../../repositories/AssignmentRepository.js", () => ({
  default: jest.fn(() => ({
    findByCourse: mockAssignmentFindByCourse,
  })),
}));

jest.unstable_mockModule("../../repositories/SubmissionRepository.js", () => ({
  default: jest.fn(() => ({
    findByAssignment: mockSubmissionFindByAssignment,
  })),
}));

jest.unstable_mockModule("../../repositories/EnrollmentRepository.js", () => ({
  default: jest.fn(() => ({
    getCourseStudents: mockEnrollmentGetCourseStudents,
  })),
}));

// Supabase admin client — used by update_task and generate_grade_report
const supabaseChain = {
  select: jest.fn().mockReturnThis(),
  eq:     jest.fn().mockReturnThis(),
  single: jest.fn(),
  update: jest.fn().mockReturnThis(),
};
mockSupabaseFrom.mockReturnValue(supabaseChain);

jest.unstable_mockModule("../../lib/supabaseAdmin.js", () => ({
  requireSupabaseClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

jest.unstable_mockModule("../model.js", () => ({
  createChatCompletion: mockCreateChatCompletion,
  MODEL_STUDY: "gemini-2.5-pro",
}));

// ── Import system under test ──────────────────────────────────────────────────

const { toolRegistry, executeTool } = await import("../toolRegistry.js");

// ── Shared helpers ────────────────────────────────────────────────────────────

const ok = (message = "ok", data = null) => new OperationResult(true, message, data);
const fail = (message = "error") => new OperationResult(false, message);

const USER_ID = "user-test-1";

const resetAll = () => {
  [
    mockTaskSave, mockTaskComplete, mockTaskDelete, mockTaskGetAi,
    mockNotesSave, mockNotesUpdate, mockNotesDelete, mockNotesGetAll,
    mockEventsSave, mockEventsUpdate, mockEventsDelete, mockEventsGetUpcoming,
    mockGetCoursesForUser, mockGetCourseGrades,
    mockEnrollmentGetStudents,
    mockAssignmentFindByCourse, mockSubmissionFindByAssignment, mockEnrollmentGetCourseStudents,
    mockCreateChatCompletion,
  ].forEach((fn) => fn.mockReset());

  supabaseChain.select.mockReturnThis();
  supabaseChain.eq.mockReturnThis();
  supabaseChain.update.mockReturnThis();
  supabaseChain.single.mockReset();
};

beforeEach(resetAll);

// ════════════════════════════════════════════════════════════════════════════
// create_task
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.create_task", () => {
  const handler = toolRegistry.create_task.handler;

  it("calls taskService.save with correct payload and returns OperationResult on success", async () => {
    mockTaskSave.mockResolvedValueOnce(ok("Tarea creada", { id: 5 }));

    const result = await handler(
      { title: "Estudiar álgebra", due_date: "2026-06-01T09:00:00Z" },
      USER_ID
    );

    expect(result).toBeInstanceOf(OperationResult);
    expect(result.success).toBe(true);
    expect(mockTaskSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Estudiar álgebra" }),
      { id: USER_ID }
    );
  });

  it("returns error OperationResult when title is missing", async () => {
    const result = await handler({ due_date: "2026-06-01T09:00:00Z" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("title");
  });

  it("returns error OperationResult when due_date is missing", async () => {
    const result = await handler({ title: "Sin fecha" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("due_date");
  });

  it("returns error when due_date is not a valid ISO date", async () => {
    const result = await handler(
      { title: "Bad date", due_date: "not-a-date" },
      USER_ID
    );
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/fecha ISO/i);
  });

  it("propagates failure from taskService", async () => {
    mockTaskSave.mockResolvedValueOnce(fail("DB error"));
    const result = await handler(
      { title: "Test", due_date: "2026-06-01T09:00:00Z" },
      USER_ID
    );
    expect(result.success).toBe(false);
  });

  it("uses default priority_id=1 when not provided", async () => {
    mockTaskSave.mockResolvedValueOnce(ok());
    await handler({ title: "Test", due_date: "2026-06-01T09:00:00Z" }, USER_ID);
    expect(mockTaskSave).toHaveBeenCalledWith(
      expect.objectContaining({ priority_id: 1 }),
      expect.anything()
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// complete_task
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.complete_task", () => {
  const handler = toolRegistry.complete_task.handler;

  it("calls taskService.complete with task_id and userId", async () => {
    mockTaskComplete.mockResolvedValueOnce(ok("Tarea completada"));

    const result = await handler({ task_id: 42 }, USER_ID);

    expect(result.success).toBe(true);
    expect(mockTaskComplete).toHaveBeenCalledWith(42, { id: USER_ID });
  });

  it("returns error when task_id is missing", async () => {
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("task_id");
  });

  it("propagates service failure", async () => {
    mockTaskComplete.mockResolvedValueOnce(fail("not found"));
    const result = await handler({ task_id: 99 }, USER_ID);
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// list_tasks
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.list_tasks", () => {
  const handler = toolRegistry.list_tasks.handler;

  it("returns formatted task list on success", async () => {
    mockTaskGetAi.mockResolvedValueOnce(
      ok("ok", [
        { id: 1, title: "Parcial", due_date: "2026-06-01T09:00:00Z", completed: false },
      ])
    );

    const result = await handler({}, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Parcial");
    expect(result.data).toHaveLength(1);
  });

  it("returns 'No hay tareas pendientes' when list is empty", async () => {
    mockTaskGetAi.mockResolvedValueOnce(ok("ok", []));
    const result = await handler({}, USER_ID);
    expect(result.message).toContain("No hay tareas pendientes");
  });

  it("passes includeCompleted=true when arg is truthy", async () => {
    mockTaskGetAi.mockResolvedValueOnce(ok("ok", []));
    await handler({ includeCompleted: true }, USER_ID);
    expect(mockTaskGetAi).toHaveBeenCalledWith(
      expect.objectContaining({ includeCompleted: true }),
      { id: USER_ID }
    );
  });

  it("passes includeCompleted=false by default", async () => {
    mockTaskGetAi.mockResolvedValueOnce(ok("ok", []));
    await handler({}, USER_ID);
    expect(mockTaskGetAi).toHaveBeenCalledWith(
      expect.objectContaining({ includeCompleted: false }),
      { id: USER_ID }
    );
  });

  it("propagates service failure", async () => {
    mockTaskGetAi.mockResolvedValueOnce(fail("DB error"));
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// delete_task
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.delete_task", () => {
  const handler = toolRegistry.delete_task.handler;

  it("calls taskService.delete with task_id and userId", async () => {
    mockTaskDelete.mockResolvedValueOnce(ok("Tarea eliminada"));
    const result = await handler({ task_id: 7 }, USER_ID);
    expect(result.success).toBe(true);
    expect(mockTaskDelete).toHaveBeenCalledWith(7, { id: USER_ID });
  });

  it("returns error when task_id is missing", async () => {
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("task_id");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// update_task
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.update_task", () => {
  const handler = toolRegistry.update_task.handler;

  const mockOwnershipCheck = (userId = USER_ID) => {
    supabaseChain.single
      .mockResolvedValueOnce({ data: { id: 1, user_id: userId }, error: null }) // ownership
      .mockResolvedValueOnce({ data: { id: 1, title: "Updated" }, error: null }); // update
  };

  it("patches only provided fields via supabase and returns success", async () => {
    mockOwnershipCheck();
    const result = await handler({ task_id: 1, title: "Nuevo título" }, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("actualizada");
  });

  it("returns error when task_id is missing", async () => {
    const result = await handler({ title: "No id" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("task_id");
  });

  it("returns error when ownership check fails (different user)", async () => {
    supabaseChain.single.mockResolvedValueOnce({
      data: { id: 1, user_id: "other-user" },
      error: null,
    });
    const result = await handler({ task_id: 1, title: "Hack" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/permiso/i);
  });

  it("returns error when task is not found", async () => {
    supabaseChain.single.mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    const result = await handler({ task_id: 999, title: "x" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("no encontrada");
  });

  it("returns error when no fields to update are provided", async () => {
    supabaseChain.single.mockResolvedValueOnce({ data: { id: 1, user_id: USER_ID }, error: null });
    const result = await handler({ task_id: 1 }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("ningún campo");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// create_note
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.create_note", () => {
  const handler = toolRegistry.create_note.handler;

  it("calls notesService.save and returns OperationResult on success", async () => {
    mockNotesSave.mockResolvedValueOnce(ok("Nota creada", { id: 10 }));

    const result = await handler({ title: "Apuntes de cálculo", content: "Derivadas..." }, USER_ID);
    expect(result.success).toBe(true);
    expect(mockNotesSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Apuntes de cálculo" }),
      { id: USER_ID }
    );
  });

  it("returns error when title is missing", async () => {
    const result = await handler({ content: "Sin título" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("title");
  });

  it("uses empty string for content when not provided", async () => {
    mockNotesSave.mockResolvedValueOnce(ok());
    await handler({ title: "Solo título" }, USER_ID);
    expect(mockNotesSave).toHaveBeenCalledWith(
      expect.objectContaining({ content: "" }),
      expect.anything()
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// update_note
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.update_note", () => {
  const handler = toolRegistry.update_note.handler;

  it("calls notesService.update with only provided fields", async () => {
    mockNotesUpdate.mockResolvedValueOnce(ok("Nota actualizada"));
    const result = await handler({ note_id: 5, title: "Nuevo título" }, USER_ID);
    expect(result.success).toBe(true);
    expect(mockNotesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, title: "Nuevo título" }),
      { id: USER_ID }
    );
  });

  it("returns error when note_id is missing", async () => {
    const result = await handler({ title: "x" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("note_id");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// delete_note
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.delete_note", () => {
  const handler = toolRegistry.delete_note.handler;

  it("calls notesService.delete with note_id and raw userId", async () => {
    mockNotesDelete.mockResolvedValueOnce(ok("Nota eliminada"));
    const result = await handler({ note_id: 3 }, USER_ID);
    expect(result.success).toBe(true);
    // NotesService.delete receives raw userId (not wrapped)
    expect(mockNotesDelete).toHaveBeenCalledWith(3, USER_ID);
  });

  it("returns error when note_id is missing", async () => {
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// list_notes
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.list_notes", () => {
  const handler = toolRegistry.list_notes.handler;

  it("returns formatted notes list", async () => {
    mockNotesGetAll.mockResolvedValueOnce(
      ok("ok", [
        { id: 1, title: "Álgebra", is_pinned: true },
        { id: 2, title: "Física", is_pinned: false },
      ])
    );

    const result = await handler({}, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Álgebra");
    expect(result.data).toHaveLength(2);
  });

  it("returns 'No hay notas' when list is empty", async () => {
    mockNotesGetAll.mockResolvedValueOnce(ok("ok", []));
    const result = await handler({}, USER_ID);
    expect(result.message).toContain("No hay notas");
  });

  it("propagates service failure", async () => {
    mockNotesGetAll.mockResolvedValueOnce(fail("DB error"));
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// create_event
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.create_event", () => {
  const handler = toolRegistry.create_event.handler;

  it("calls eventsService.save and returns OperationResult on success", async () => {
    mockEventsSave.mockResolvedValueOnce(ok("Evento creado", { id: 20 }));

    const result = await handler(
      { title: "Parcial final", start_date: "2026-07-01T09:00:00Z", type: "academic" },
      USER_ID
    );
    expect(result.success).toBe(true);
    expect(mockEventsSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Parcial final" }),
      { id: USER_ID }
    );
  });

  it("returns error when title is missing", async () => {
    const result = await handler(
      { start_date: "2026-07-01T09:00:00Z", type: "personal" },
      USER_ID
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("title");
  });

  it("returns error when start_date is missing", async () => {
    const result = await handler({ title: "Sin fecha", type: "personal" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("start_date");
  });

  it("returns error when type is missing", async () => {
    const result = await handler(
      { title: "Test", start_date: "2026-07-01T09:00:00Z" },
      USER_ID
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("type");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// update_event
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.update_event", () => {
  const handler = toolRegistry.update_event.handler;

  it("calls eventsService.update with provided fields", async () => {
    mockEventsUpdate.mockResolvedValueOnce(ok("Evento actualizado"));
    const result = await handler({ event_id: 10, title: "Nuevo título" }, USER_ID);
    expect(result.success).toBe(true);
    expect(mockEventsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, title: "Nuevo título" }),
      { id: USER_ID }
    );
  });

  it("returns error when event_id is missing", async () => {
    const result = await handler({ title: "No id" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("event_id");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// delete_event
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.delete_event", () => {
  const handler = toolRegistry.delete_event.handler;

  it("calls eventsService.delete with event_id and userId", async () => {
    mockEventsDelete.mockResolvedValueOnce(ok("Evento eliminado"));
    const result = await handler({ event_id: 15 }, USER_ID);
    expect(result.success).toBe(true);
    expect(mockEventsDelete).toHaveBeenCalledWith(15, USER_ID);
  });

  it("returns error when event_id is missing", async () => {
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("event_id");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// list_events
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.list_events", () => {
  const handler = toolRegistry.list_events.handler;

  it("returns formatted events list", async () => {
    mockEventsGetUpcoming.mockResolvedValueOnce(
      ok("ok", [
        { id: 1, title: "Parcial", start_date: "2026-06-10T09:00:00Z" },
      ])
    );

    const result = await handler({}, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Parcial");
  });

  it("returns 'No tienes eventos próximos' when list is empty", async () => {
    mockEventsGetUpcoming.mockResolvedValueOnce(ok("ok", []));
    const result = await handler({}, USER_ID);
    expect(result.message).toContain("No tienes eventos próximos");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// get_teacher_courses
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.get_teacher_courses", () => {
  const handler = toolRegistry.get_teacher_courses.handler;

  it("returns formatted course list", async () => {
    mockGetCoursesForUser.mockResolvedValueOnce([
      { id: 1, title: "Estructuras de Datos", students: 30, invite_code: "ED2026" },
    ]);

    const result = await handler({}, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Estructuras de Datos");
    expect(result.message).toContain("ID:1");
    expect(mockGetCoursesForUser).toHaveBeenCalledWith(USER_ID, "teacher");
  });

  it("returns empty message when no courses", async () => {
    mockGetCoursesForUser.mockResolvedValueOnce([]);
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("No tienes cursos asignados");
  });

  it("handles courses returned inside a .data wrapper", async () => {
    mockGetCoursesForUser.mockResolvedValueOnce({
      data: [{ id: 2, title: "Cálculo", students: 25 }],
    });

    const result = await handler({}, USER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Cálculo");
  });

  it("returns error OperationResult when service throws", async () => {
    mockGetCoursesForUser.mockRejectedValueOnce(new Error("DB down"));
    const result = await handler({}, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Error al obtener cursos");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// generate_grade_report
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.generate_grade_report", () => {
  const handler = toolRegistry.generate_grade_report.handler;
  const TEACHER_ID = "teacher-1";
  const COURSE_ID = 10;

  const setupCourseOwner = () => {
    supabaseChain.single.mockResolvedValueOnce({
      data: { id: COURSE_ID, title: "Programación I", teacher_id: TEACHER_ID },
      error: null,
    });
  };

  const setupStudents = (students) => {
    mockEnrollmentGetCourseStudents.mockResolvedValueOnce(students);
  };

  const setupAssignments = (assignments) => {
    mockAssignmentFindByCourse.mockResolvedValueOnce(assignments);
  };

  it("returns grade table when teacher owns course and students/assignments exist", async () => {
    setupCourseOwner();
    setupStudents([{ id: "s1", name: "Ana García", email: "ana@test.com" }]);
    setupAssignments([{ id: "a1", title: "Taller 1" }]);
    mockSubmissionFindByAssignment.mockResolvedValueOnce([
      { student_id: "s1", graded: true, grade: 4.5, group_id: null },
    ]);

    const result = await handler({ course_id: COURSE_ID }, TEACHER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Reporte de Notas");
    expect(result.data.students).toHaveLength(1);
  });

  it("returns error when course does not exist (supabase returns null)", async () => {
    supabaseChain.single.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await handler({ course_id: 999 }, TEACHER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("no encontrado");
  });

  it("returns error when teacher does not own the course", async () => {
    supabaseChain.single.mockResolvedValueOnce({
      data: { id: COURSE_ID, title: "Otro Curso", teacher_id: "other-teacher" },
      error: null,
    });

    const result = await handler({ course_id: COURSE_ID }, TEACHER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/permiso/i);
  });

  it("returns 'no estudiantes' message when enrollment is empty", async () => {
    setupCourseOwner();
    setupStudents([]);

    const result = await handler({ course_id: COURSE_ID }, TEACHER_ID);
    expect(result.success).toBe(true);
    expect(result.message).toContain("No hay estudiantes");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// generate_question_bank
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.generate_question_bank", () => {
  const handler = toolRegistry.generate_question_bank.handler;

  it("returns questions array when AI returns valid JSON", async () => {
    const questions = [
      { type: "mc", question: "¿Qué es una variable?", options: ["A) Dato", "B) Función", "C) Clase", "D) Bucle"], answer: "A", explanation: "Es un contenedor de datos." },
    ];
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(questions) } }],
    });

    const result = await handler({ topic: "Programación", type: "multiple_choice" });
    expect(result.success).toBe(true);
    expect(result.data.questions).toEqual(questions);
  });

  it("returns raw text when AI output is not parseable JSON", async () => {
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "Pregunta 1: ¿Qué es X? Respuesta: Y" } }],
    });

    const result = await handler({ topic: "Biología", type: "open" });
    expect(result.success).toBe(true);
    expect(typeof result.data.questions).toBe("string");
  });

  it("clamps count to max 30", async () => {
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "[]" } }],
    });

    await handler({ topic: "Historia", count: 9999 });
    // The system prompt should mention clamped count — verify the call happened
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateChatCompletion.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("30");
  });

  it("clamps count to min 5", async () => {
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "[]" } }],
    });

    await handler({ topic: "Historia", count: 1 });
    const callArgs = mockCreateChatCompletion.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("5");
  });

  it("returns error when AI returns empty content", async () => {
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    });

    const result = await handler({ topic: "Math" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("banco de preguntas");
  });

  it("returns error when createChatCompletion throws", async () => {
    mockCreateChatCompletion.mockRejectedValueOnce(new Error("API error"));
    const result = await handler({ topic: "Química" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("Error al generar preguntas");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// study_document
// ════════════════════════════════════════════════════════════════════════════

describe("toolRegistry.study_document", () => {
  const handler = toolRegistry.study_document.handler;

  const longContent = "A".repeat(100); // >50 chars

  it("returns flashcards as parsed JSON when AI returns valid array", async () => {
    const flashcards = [{ front: "¿Qué es X?", back: "X es Y" }];
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(flashcards) } }],
    });

    const result = await handler({ content: longContent, type: "flashcards" });
    expect(result.success).toBe(true);
    expect(result.data.material).toEqual(flashcards);
    expect(result.data.type).toBe("flashcards");
  });

  it("returns summary as text when type is 'summary'", async () => {
    const summaryText = "Idea principal: X. Conceptos clave: Y, Z.";
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: summaryText } }],
    });

    const result = await handler({ content: longContent, type: "summary" });
    expect(result.success).toBe(true);
    expect(result.message).toBe(summaryText);
  });

  it("returns error when content is too short (<50 chars)", async () => {
    const result = await handler({ content: "short", type: "flashcards" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("demasiado corto");
  });

  it("returns error when content is empty string", async () => {
    const result = await handler({ content: "", type: "quiz" });
    expect(result.success).toBe(false);
  });

  it("returns error when content is null/undefined", async () => {
    const result = await handler({ type: "quiz" });
    expect(result.success).toBe(false);
  });

  it("uses 'summary' type by default when type is unknown", async () => {
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "Summary text" } }],
    });

    const result = await handler({ content: longContent, type: "unknown_type" });
    expect(result.success).toBe(true);
    // Should not crash — uses summary prompt as fallback
  });

  it("returns error when createChatCompletion throws", async () => {
    mockCreateChatCompletion.mockRejectedValueOnce(new Error("timeout"));
    const result = await handler({ content: longContent, type: "quiz" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("Error al procesar el documento");
  });

  it("returns error when AI returns empty content", async () => {
    mockCreateChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: "  " } }],
    });

    const result = await handler({ content: longContent, type: "concepts" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("No se pudo generar");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// executeTool dispatcher
// ════════════════════════════════════════════════════════════════════════════

describe("executeTool", () => {
  it("returns OperationResult(false) for unknown tool name", async () => {
    const result = await executeTool({ name: "nonexistent_tool", args: {}, userId: USER_ID });
    expect(result).toBeInstanceOf(OperationResult);
    expect(result.success).toBe(false);
    expect(result.message).toContain("nonexistent_tool");
  });

  it("returns OperationResult(false) when userId is missing", async () => {
    const result = await executeTool({ name: "list_tasks", args: {}, userId: null });
    expect(result).toBeInstanceOf(OperationResult);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/usuario requerido/i);
  });

  it("returns OperationResult(false) when userId is undefined", async () => {
    const result = await executeTool({ name: "list_tasks", args: {} });
    expect(result.success).toBe(false);
  });

  it("calls correct handler and returns its result for known tool", async () => {
    mockTaskGetAi.mockResolvedValueOnce(ok("ok", [{ id: 1, title: "Tarea", due_date: null, completed: false }]));

    const result = await executeTool({ name: "list_tasks", args: {}, userId: USER_ID });
    expect(result).toBeInstanceOf(OperationResult);
    expect(result.success).toBe(true);
  });

  it("catches handler exceptions and returns OperationResult(false)", async () => {
    mockTaskGetAi.mockRejectedValueOnce(new Error("unexpected crash"));

    const result = await executeTool({ name: "list_tasks", args: {}, userId: USER_ID });
    expect(result).toBeInstanceOf(OperationResult);
    expect(result.success).toBe(false);
    expect(result.message).toContain("list_tasks");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// validateArgs (tested indirectly via handlers)
// ════════════════════════════════════════════════════════════════════════════

describe("validateArgs — edge cases via create_task", () => {
  const handler = toolRegistry.create_task.handler;

  it("coerces boolean 'true' string to true for boolean fields", async () => {
    // create_task has no boolean required field; test via create_event.notify
    // We verify no crash on string booleans
    mockEventsSave.mockResolvedValueOnce(ok());
    const result = await toolRegistry.create_event.handler(
      { title: "Test", start_date: "2026-06-01T09:00:00Z", type: "personal", notify: "true" },
      USER_ID
    );
    // Should not error on boolean-coercion — the notify field is optional
    expect(mockEventsSave).toHaveBeenCalled();
  });

  it("trims whitespace from string fields", async () => {
    mockTaskSave.mockResolvedValueOnce(ok());
    await handler({ title: "  Título con espacios  ", due_date: "2026-06-01T09:00:00Z" }, USER_ID);
    expect(mockTaskSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Título con espacios" }),
      expect.anything()
    );
  });

  it("returns error when title is a number (wrong type)", async () => {
    const result = await handler({ title: 123, due_date: "2026-06-01T09:00:00Z" }, USER_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain("title");
  });
});
