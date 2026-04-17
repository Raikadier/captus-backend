export const extractJson = (raw) => {
  if (!raw || typeof raw !== "string") return null;

  // Remove markdown fences and trim
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Try to recover first JSON-like object in string
    const match = cleaned.match(/\{[\s\S]*\}/m);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (err) {
      console.warn("[AI/json] Failed to parse JSON payload", err.message);
      return null;
    }
  }
};

export const normalizeToolArgs = (args) => {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch (err) {
      console.warn("[AI/json] Failed to parse tool args string", err.message);
      return {};
    }
  }
  return args;
};
