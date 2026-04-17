import { randomUUID } from "crypto";
import { jest } from "@jest/globals";
import { executeTool } from "../src/ai/toolRegistry.js";
import { extractJson } from "../src/ai/utils/json.js";
import { requireSupabaseClient } from "../src/lib/supabaseAdmin.js";
import { OperationResult } from "../src/shared/OperationResult.js";

// Test config
process.env.GMAIL_USER = "";
process.env.GMAIL_APP_PASSWORD = "";
jest.setTimeout(30000);

const TEST_USER_ID = process.env.TEST_USER_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helpers
const expectSuccess = (result) => {
  if (!result?.success) {
    // eslint-disable-next-line no-console
    console.error("OperationResult failure", result);
  }
  expect(result).toBeInstanceOf(OperationResult);
  expect(result.success).toBe(true);
};

describe("AI tools E2E", () => {
  if (!TEST_USER_ID || !SUPABASE_URL || !SUPABASE_KEY) {
    test.skip("Requiere TEST_USER_ID, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para correr", () => {});
    return;
  }

  const client = requireSupabaseClient();
  const cleanup = { tasks: [], notes: [], events: [] };

  afterAll(async () => {
    if (cleanup.tasks.length) {
      await client.from("tasks").delete().in("id", cleanup.tasks);
    }
    if (cleanup.notes.length) {
      await client.from("notes").delete().in("id", cleanup.notes);
    }
    if (cleanup.events.length) {
      await client.from("events").delete().in("id", cleanup.events);
    }
  });

  test("create/list/complete task", async () => {
    const suffix = randomUUID().slice(0, 6);
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const createResult = await executeTool({
      name: "create_task",
      args: { title: `Prueba tarea ${suffix}`, description: "IA E2E", due_date: dueDate, priority_id: 1 },
      userId: TEST_USER_ID,
    });
    expectSuccess(createResult);
    const taskId = createResult.data?.id || createResult.data?.id_Task;
    cleanup.tasks.push(taskId);

    const listResult = await executeTool({ name: "list_tasks", args: {}, userId: TEST_USER_ID });
    expectSuccess(listResult);
    expect(listResult.data.some((t) => t.id === taskId || t.id_Task === taskId)).toBe(true);

    const completeResult = await executeTool({ name: "complete_task", args: { task_id: taskId }, userId: TEST_USER_ID });
    expectSuccess(completeResult);
  });

  test("create/update/list note", async () => {
    const suffix = randomUUID().slice(0, 6);
    const createResult = await executeTool({
      name: "create_note",
      args: { title: `Nota ${suffix}`, content: "contenido inicial" },
      userId: TEST_USER_ID,
    });
    expectSuccess(createResult);
    const noteId = createResult.data?.id;
    cleanup.notes.push(noteId);

    const updateResult = await executeTool({
      name: "update_note",
      args: { note_id: noteId, content: "contenido actualizado" },
      userId: TEST_USER_ID,
    });
    expectSuccess(updateResult);

    const listResult = await executeTool({ name: "list_notes", args: {}, userId: TEST_USER_ID });
    expectSuccess(listResult);
    expect(listResult.data.some((n) => n.id === noteId)).toBe(true);
  });

  test("create/update/list event", async () => {
    const suffix = randomUUID().slice(0, 6);
    const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const createResult = await executeTool({
      name: "create_event",
      args: { title: `Evento ${suffix}`, description: "evento de prueba", start_date: startDate, end_date: endDate, type: "personal" },
      userId: TEST_USER_ID,
    });
    expectSuccess(createResult);
    const eventId = createResult.data?.id;
    cleanup.events.push(eventId);

    const updateResult = await executeTool({
      name: "update_event",
      args: {
        event_id: eventId,
        title: `Evento ${suffix} editado`,
        description: "evento actualizado",
        start_date: startDate,
        end_date: endDate,
        type: "personal",
      },
      userId: TEST_USER_ID,
    });
    expectSuccess(updateResult);

    const listResult = await executeTool({ name: "list_events", args: {}, userId: TEST_USER_ID });
    expectSuccess(listResult);
    expect(listResult.data.some((e) => e.id === eventId)).toBe(true);
  });

  test("security: impedir modificar tarea de otro usuario", async () => {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createResult = await executeTool({
      name: "create_task",
      args: { title: "Tarea protegida", due_date: dueDate },
      userId: TEST_USER_ID,
    });
    expectSuccess(createResult);
    const taskId = createResult.data?.id || createResult.data?.id_Task;
    cleanup.tasks.push(taskId);

    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const crossResult = await executeTool({
      name: "complete_task",
      args: { task_id: taskId },
      userId: fakeUserId,
    });

    expect(crossResult).toBeInstanceOf(OperationResult);
    expect(crossResult.success).toBe(false);
  });
});

describe("Orchestrator JSON resilience", () => {
  test("extractJson tolerates ruido y code fences", () => {
    const noisy = "Respuesta ```json\n{\"tool\":\"create_task\",\"input\":{\"title\":\"hola\",\"due_date\":\"2025-01-01T00:00:00Z\"}}\n``` fin";
    const parsed = extractJson(noisy);
    expect(parsed.tool).toBe("create_task");
    expect(parsed.input.title).toBe("hola");
  });
});
