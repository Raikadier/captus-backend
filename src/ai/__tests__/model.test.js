/**
 * Tests for src/ai/model.js
 *
 * Strategy: mock the `openai` package so `gemini` uses a fake client.
 * We re-import model.js AFTER setting up the mock via jest.unstable_mockModule.
 */

import { jest } from "@jest/globals";

// ── Mock factory helpers ──────────────────────────────────────────────────────

const mockCreate = jest.fn();

// Mock the `openai` module — the constructor returns an object whose
// chat.completions.create is our controllable mock.
jest.unstable_mockModule("openai", () => {
  const MockOpenAI = jest.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
  // default export
  return { default: MockOpenAI };
});

// Import AFTER mocks are registered
const {
  createChatCompletion,
  MODEL_FAST,
  MODEL_REASON,
  MODEL_STUDY,
} = await import("../model.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeResponse = (content = "Hello") => ({
  choices: [{ message: { content, role: "assistant" } }],
});

const make429 = () => {
  const err = new Error("Rate limit exceeded");
  err.status = 429;
  return err;
};

const make400 = () => {
  const err = new Error("Bad request");
  err.status = 400;
  return err;
};

const make503 = () => {
  const err = new Error("Service unavailable");
  err.status = 503;
  return err;
};

// ── MODEL constants ───────────────────────────────────────────────────────────

describe("model constants", () => {
  it("MODEL_FAST is defined and non-empty", () => {
    expect(typeof MODEL_FAST).toBe("string");
    expect(MODEL_FAST.length).toBeGreaterThan(0);
  });

  it("MODEL_REASON is defined and non-empty", () => {
    expect(typeof MODEL_REASON).toBe("string");
    expect(MODEL_REASON.length).toBeGreaterThan(0);
  });

  it("MODEL_STUDY is defined and non-empty", () => {
    expect(typeof MODEL_STUDY).toBe("string");
    expect(MODEL_STUDY.length).toBeGreaterThan(0);
  });
});

// ── createChatCompletion — success path ──────────────────────────────────────

describe("createChatCompletion — success", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns response on the first attempt", async () => {
    const expected = makeResponse("Response text");
    mockCreate.mockResolvedValueOnce(expected);

    const result = await createChatCompletion({
      model: MODEL_FAST,
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result).toBe(expected);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("forwards all params to the underlying client", async () => {
    mockCreate.mockResolvedValueOnce(makeResponse());
    const params = {
      model: MODEL_REASON,
      messages: [{ role: "system", content: "sys" }, { role: "user", content: "q" }],
      temperature: 0.2,
      tools: [{ type: "function", function: { name: "my_tool" } }],
      tool_choice: "auto",
    };

    await createChatCompletion(params, { purpose: "reason" });

    expect(mockCreate).toHaveBeenCalledWith(params);
  });
});

// ── createChatCompletion — retry logic ───────────────────────────────────────

describe("createChatCompletion — retries", () => {
  // Silence console.warn during retry/fallback tests
  beforeAll(() => jest.spyOn(console, "warn").mockImplementation(() => {}));
  afterAll(() => console.warn.mockRestore());
  beforeEach(() => mockCreate.mockReset());

  it("retries on 429 and succeeds on second attempt", async () => {
    mockCreate
      .mockRejectedValueOnce(make429())
      .mockResolvedValueOnce(makeResponse("Retry success"));

    const result = await createChatCompletion({ model: MODEL_FAST, messages: [] });
    expect(result.choices[0].message.content).toBe("Retry success");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 and succeeds on third attempt", async () => {
    mockCreate
      .mockRejectedValueOnce(make503())
      .mockRejectedValueOnce(make503())
      .mockResolvedValueOnce(makeResponse("Third attempt"));

    const result = await createChatCompletion({ model: MODEL_FAST, messages: [] });
    expect(result.choices[0].message.content).toBe("Third attempt");
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on non-retryable 400 error — throws immediately", async () => {
    mockCreate.mockRejectedValueOnce(make400());

    await expect(
      createChatCompletion({ model: MODEL_FAST, messages: [] })
    ).rejects.toMatchObject({ status: 400 });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws last error after all retries are exhausted with no fallback providers", async () => {
    // 3 total attempts: initial + 2 retries (RETRY_DELAYS_MS has 2 entries)
    mockCreate
      .mockRejectedValueOnce(make429())
      .mockRejectedValueOnce(make429())
      .mockRejectedValueOnce(make429());

    await expect(
      createChatCompletion({ model: MODEL_FAST, messages: [] })
    ).rejects.toMatchObject({ status: 429 });

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});

// ── createChatCompletion — purpose routing ───────────────────────────────────

describe("createChatCompletion — purpose option", () => {
  beforeEach(() => mockCreate.mockReset());

  it("purpose 'fast' succeeds and calls gemini client", async () => {
    mockCreate.mockResolvedValueOnce(makeResponse("fast reply"));
    const result = await createChatCompletion(
      { model: MODEL_FAST, messages: [] },
      { purpose: "fast" }
    );
    expect(result.choices[0].message.content).toBe("fast reply");
  });

  it("purpose 'reason' succeeds and calls gemini client", async () => {
    mockCreate.mockResolvedValueOnce(makeResponse("reason reply"));
    const result = await createChatCompletion(
      { model: MODEL_REASON, messages: [] },
      { purpose: "reason" }
    );
    expect(result.choices[0].message.content).toBe("reason reply");
  });

  it("purpose 'study' succeeds and calls gemini client", async () => {
    mockCreate.mockResolvedValueOnce(makeResponse("study reply"));
    const result = await createChatCompletion(
      { model: MODEL_STUDY, messages: [] },
      { purpose: "study" }
    );
    expect(result.choices[0].message.content).toBe("study reply");
  });

  it("non-gemini provider bypasses retry logic and calls create once", async () => {
    mockCreate.mockResolvedValueOnce(makeResponse("direct"));
    const result = await createChatCompletion(
      { model: MODEL_FAST, messages: [] },
      { provider: "other" }
    );
    expect(result.choices[0].message.content).toBe("direct");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
