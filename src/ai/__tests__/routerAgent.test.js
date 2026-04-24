import { jest } from "@jest/globals";

const createMock = jest.fn();
const fetchContextForIntentMock = jest.fn();
const orchestratorMock = jest.fn();

jest.unstable_mockModule("../model.js", () => ({
  createChatCompletion: createMock,
  MODEL_FAST: "fast-model",
}));

jest.unstable_mockModule("../prompts.js", () => ({
  allowedIntents: ["tasks", "general"],
  buildRouterSystemPrompt: jest.fn(() => "router-system-prompt"),
}));

jest.unstable_mockModule("../context.js", () => ({
  fetchContextForIntent: fetchContextForIntentMock,
}));

jest.unstable_mockModule("../orchestrator.js", () => ({
  orchestrator: orchestratorMock,
}));

const { routerAgent } = await import("../routerAgent.js");

describe("routerAgent message handoff", () => {
  beforeEach(() => {
    createMock.mockReset();
    fetchContextForIntentMock.mockReset();
    orchestratorMock.mockReset();
  });

  it("passes original message to orchestrator without CTX prefix injection", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"intent":"general"}' } }],
    });
    fetchContextForIntentMock.mockResolvedValueOnce(null);
    orchestratorMock.mockResolvedValueOnce({ result: "ok" });

    await routerAgent("Hola Captus", "user-1", [], "student");

    expect(orchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Hola Captus",
        intent: "general",
        userId: "user-1",
      })
    );
  });
});
