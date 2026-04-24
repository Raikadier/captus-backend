import { jest } from "@jest/globals";
import { OperationResult } from "../../shared/OperationResult.js";

const createMock = jest.fn();
const executeToolMock = jest.fn();

jest.unstable_mockModule("../model.js", () => ({
  createChatCompletion: createMock,
  MODEL_REASON: "reason-model",
  MODEL_FAST: "fast-model",
}));

jest.unstable_mockModule("../prompts.js", () => ({
  buildOrchestratorSystemPrompt: jest.fn(() => "mock-system-prompt"),
}));

jest.unstable_mockModule("../toolRegistry.js", () => ({
  executeTool: executeToolMock,
  toolDefinitions: [],
  toolRegistry: {},
}));

const { orchestrator } = await import("../orchestrator.js");

describe("orchestrator fallback behavior", () => {
  beforeEach(() => {
    createMock.mockReset();
    executeToolMock.mockReset();
  });

  it("returns reasoning model text when no tool call exists", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "Respuesta contextual del modelo." } }],
    });

    const result = await orchestrator({
      message: "Que tareas tengo hoy?",
      userId: "user-1",
      intent: "tasks",
      contextData: "- [1] Taller de algebra",
      conversationHistory: [],
      userRole: "student",
    });

    expect(result.result).toBe("Respuesta contextual del modelo.");
    expect(result.actionPerformed).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("uses fast fallback only when reasoning model returns empty content", async () => {
    createMock
      .mockResolvedValueOnce({ choices: [{ message: { content: "" } }] })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Fallback conversacional." } }],
      });

    const result = await orchestrator({
      message: "Ayudame",
      userId: "user-1",
      intent: "notes",
      contextData: null,
      conversationHistory: [],
      userRole: "student",
    });

    expect(result.result).toBe("Fallback conversacional.");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("executes tool call and returns rendered tool result", async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: "create_task",
                  arguments: JSON.stringify({ title: "Parcial", due_date: "2026-05-01T10:00:00Z" }),
                },
              },
            ],
          },
        },
      ],
    });
    executeToolMock.mockResolvedValueOnce(
      new OperationResult(true, "Tarea creada", { id: 10 })
    );

    const result = await orchestrator({
      message: "Crea una tarea para parcial",
      userId: "user-1",
      intent: "tasks",
      contextData: null,
      conversationHistory: [],
      userRole: "student",
    });

    expect(executeToolMock).toHaveBeenCalledWith({
      name: "create_task",
      args: { title: "Parcial", due_date: "2026-05-01T10:00:00Z" },
      userId: "user-1",
    });
    expect(result.result).toBe("Tarea creada");
    expect(result.actionPerformed).toBe("create_task");
    expect(result.data).toEqual({ id: 10 });
  });
});
