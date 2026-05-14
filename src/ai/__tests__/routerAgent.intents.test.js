/**
 * Additional routerAgent tests focused on intent classification paths.
 *
 * These complement the existing routerAgent.test.js which tests message passthrough.
 * Here we test: every valid intent is forwarded correctly, invalid intents fall back
 * to 'general', missing intent field falls back to 'general', and teacher role is
 * passed through to the orchestrator.
 */

import { jest } from "@jest/globals";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const createMock = jest.fn();
const fetchContextForIntentMock = jest.fn();
const orchestratorMock = jest.fn();

jest.unstable_mockModule("../model.js", () => ({
  createChatCompletion: createMock,
  MODEL_FAST: "fast-model",
}));

// Use the REAL allowedIntents so tests stay in sync with prompts.js
jest.unstable_mockModule("../prompts.js", () => ({
  allowedIntents: [
    "tasks",
    "notes",
    "events",
    "study",
    "teacher_analytics",
    "teacher_content",
    "notifications",
    "general",
  ],
  buildRouterSystemPrompt: jest.fn(() => "router-system-prompt"),
}));

jest.unstable_mockModule("../context.js", () => ({
  fetchContextForIntent: fetchContextForIntentMock,
}));

jest.unstable_mockModule("../orchestrator.js", () => ({
  orchestrator: orchestratorMock,
}));

// supabaseAdmin is imported by routerAgent for profile fetch — stub it out
jest.unstable_mockModule("../../lib/supabaseAdmin.js", () => ({
  requireSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

const { routerAgent } = await import("../routerAgent.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

const classificationResponse = (intent) => ({
  choices: [{ message: { content: JSON.stringify({ intent, reason: "test" }) } }],
});

const setupMocks = (intent) => {
  createMock.mockResolvedValueOnce(classificationResponse(intent));
  fetchContextForIntentMock.mockResolvedValueOnce(null);
  orchestratorMock.mockResolvedValueOnce({ result: "ok", actionPerformed: null, steps: [] });
};

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  createMock.mockReset();
  fetchContextForIntentMock.mockReset();
  orchestratorMock.mockReset();
});

// ── All valid intents are forwarded correctly ────────────────────────────────

describe("routerAgent — valid intents forwarded to orchestrator", () => {
  const validIntents = [
    "tasks",
    "notes",
    "events",
    "study",
    "teacher_analytics",
    "teacher_content",
    "notifications",
    "general",
  ];

  for (const intent of validIntents) {
    it(`forwards intent '${intent}' to orchestrator unchanged`, async () => {
      setupMocks(intent);

      await routerAgent("some message", "user-1", [], "student");

      expect(orchestratorMock).toHaveBeenCalledWith(
        expect.objectContaining({ intent })
      );
    });
  }
});

// ── Invalid / unknown intent falls back to 'general' ─────────────────────────

describe("routerAgent — invalid intent fallback", () => {
  it("falls back to 'general' for an unknown intent string", async () => {
    createMock.mockResolvedValueOnce(
      classificationResponse("this_is_not_valid")
    );
    fetchContextForIntentMock.mockResolvedValueOnce(null);
    orchestratorMock.mockResolvedValueOnce({ result: "ok", steps: [] });

    await routerAgent("hello", "user-1", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "general" })
    );
  });

  it("falls back to 'general' when intent field is missing from JSON", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"reason":"something"}' } }],
    });
    fetchContextForIntentMock.mockResolvedValueOnce(null);
    orchestratorMock.mockResolvedValueOnce({ result: "ok", steps: [] });

    await routerAgent("hello", "user-1", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "general" })
    );
  });

  it("falls back to 'general' when LLM returns empty JSON object", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "{}" } }],
    });
    fetchContextForIntentMock.mockResolvedValueOnce(null);
    orchestratorMock.mockResolvedValueOnce({ result: "ok", steps: [] });

    await routerAgent("hello", "user-1", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "general" })
    );
  });

  it("falls back to 'general' when LLM returns malformed JSON", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not json at all" } }],
    });
    fetchContextForIntentMock.mockResolvedValueOnce(null);
    orchestratorMock.mockResolvedValueOnce({ result: "ok", steps: [] });

    await routerAgent("hello", "user-1", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "general" })
    );
  });
});

// ── Teacher role is passed through ───────────────────────────────────────────

describe("routerAgent — teacher role passthrough", () => {
  it("passes userRole='teacher' to orchestrator", async () => {
    setupMocks("teacher_analytics");

    await routerAgent("Quiero ver estadísticas", "teacher-99", [], "teacher");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: "teacher",
        userId: "teacher-99",
        intent: "teacher_analytics",
      })
    );
  });

  it("passes userRole='student' by default when not specified", async () => {
    setupMocks("tasks");

    await routerAgent("Mis tareas", "user-42");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ userRole: "student" })
    );
  });
});

// ── Context pre-fetch is called with the resolved intent ─────────────────────

describe("routerAgent — context pre-fetch", () => {
  it("calls fetchContextForIntent with the resolved intent and userId", async () => {
    setupMocks("notes");

    await routerAgent("Muestra mis notas", "user-7", [], "student");

    expect(fetchContextForIntentMock).toHaveBeenCalledWith(
      "notes",
      "user-7",
      "student"
    );
  });

  it("passes contextData from fetchContextForIntent to orchestrator", async () => {
    createMock.mockResolvedValueOnce(classificationResponse("tasks"));
    fetchContextForIntentMock.mockResolvedValueOnce("- [1] Parcial Cálculo");
    orchestratorMock.mockResolvedValueOnce({ result: "ok", steps: [] });

    await routerAgent("Mis tareas", "user-8", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ contextData: "- [1] Parcial Cálculo" })
    );
  });

  it("passes null contextData when fetchContextForIntent returns null", async () => {
    createMock.mockResolvedValueOnce(classificationResponse("general"));
    fetchContextForIntentMock.mockResolvedValueOnce(null);
    orchestratorMock.mockResolvedValueOnce({ result: "ok", steps: [] });

    await routerAgent("Hola", "user-9", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ contextData: null })
    );
  });
});

// ── Conversation history is forwarded ────────────────────────────────────────

describe("routerAgent — conversation history", () => {
  it("passes conversation history to orchestrator", async () => {
    const history = [
      { role: "user", content: "Hola" },
      { role: "bot", content: "¡Hola! ¿En qué te ayudo?" },
    ];

    setupMocks("general");

    await routerAgent("¿Mis tareas?", "user-5", history, "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationHistory: history })
    );
  });
});
