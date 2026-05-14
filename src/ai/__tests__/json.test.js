/**
 * Tests for src/ai/utils/json.js
 * Tests both extractJson and normalizeToolArgs.
 */

import { extractJson, normalizeToolArgs } from "../utils/json.js";

// ── extractJson ───────────────────────────────────────────────────────────────

describe("extractJson", () => {
  it("parses a plain JSON string", () => {
    const result = extractJson('{"tool":"create_task","input":{"title":"Test"}}');
    expect(result).toEqual({ tool: "create_task", input: { title: "Test" } });
  });

  it("strips ```json ... ``` markdown fences and parses", () => {
    const raw = '```json\n{"intent":"tasks","reason":"tareas"}\n```';
    const result = extractJson(raw);
    expect(result).toEqual({ intent: "tasks", reason: "tareas" });
  });

  it("strips ``` fences without language tag", () => {
    const raw = '```\n{"key":"value"}\n```';
    const result = extractJson(raw);
    expect(result).toEqual({ key: "value" });
  });

  it("extracts first { } block when JSON is embedded in prose text", () => {
    const raw = 'Here is the response: {"tool":"list_tasks","input":{}} — done.';
    const result = extractJson(raw);
    expect(result).toEqual({ tool: "list_tasks", input: {} });
  });

  it("returns null for malformed JSON", () => {
    const result = extractJson('{"broken": json}');
    expect(result).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractJson(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(extractJson(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractJson("")).toBeNull();
  });

  it("returns null when there is no JSON object in text", () => {
    expect(extractJson("just plain text with no braces")).toBeNull();
  });

  it("handles the canonical tool+input shape correctly", () => {
    const json = '{"tool":"create_task","input":{"title":"Test"}}';
    const result = extractJson(json);
    expect(result.tool).toBe("create_task");
    expect(result.input.title).toBe("Test");
  });

  it("parses nested objects correctly", () => {
    const raw = '{"outer":{"inner":{"deep":true}}}';
    const result = extractJson(raw);
    expect(result.outer.inner.deep).toBe(true);
  });

  it("parses arrays at the top level when wrapped in an object", () => {
    const raw = '{"items":[1,2,3]}';
    const result = extractJson(raw);
    expect(result.items).toEqual([1, 2, 3]);
  });

  it("is case-insensitive when stripping ```JSON fences", () => {
    const raw = '```JSON\n{"a":1}\n```';
    const result = extractJson(raw);
    expect(result).toEqual({ a: 1 });
  });
});

// ── normalizeToolArgs ─────────────────────────────────────────────────────────

describe("normalizeToolArgs", () => {
  it("parses a valid JSON string into an object", () => {
    const result = normalizeToolArgs('{"title":"Buy milk","due_date":"2026-05-20T00:00:00Z"}');
    expect(result).toEqual({ title: "Buy milk", due_date: "2026-05-20T00:00:00Z" });
  });

  it("returns an object as-is (no double-parsing)", () => {
    const obj = { task_id: 42 };
    const result = normalizeToolArgs(obj);
    expect(result).toBe(obj);
  });

  it("returns {} for null input", () => {
    expect(normalizeToolArgs(null)).toEqual({});
  });

  it("returns {} for undefined input", () => {
    expect(normalizeToolArgs(undefined)).toEqual({});
  });

  it("returns {} for invalid JSON string", () => {
    expect(normalizeToolArgs("{invalid json}")).toEqual({});
  });

  it("returns {} for empty string", () => {
    expect(normalizeToolArgs("")).toEqual({});
  });

  it("handles empty JSON object string", () => {
    expect(normalizeToolArgs("{}")).toEqual({});
  });

  it("preserves numeric and boolean values", () => {
    const result = normalizeToolArgs('{"count":5,"active":true}');
    expect(result.count).toBe(5);
    expect(result.active).toBe(true);
  });
});
