import { createChatCompletion, MODEL_REASON, MODEL_FAST } from "./model.js";
import { buildOrchestratorSystemPrompt } from "./prompts.js";
import { executeTool, toolDefinitions, toolRegistry } from "./toolRegistry.js";
import { extractJson, normalizeToolArgs } from "./utils/json.js";
import { OperationResult } from "../shared/OperationResult.js";

const renderOperationResult = (toolName, op) => {
  if (!op) return { result: "No se recibió respuesta de la herramienta.", actionPerformed: null, data: null };
  if (!(op instanceof OperationResult)) {
    return {
      result: String(op),
      actionPerformed: toolName,
      data: null,
    };
  }

  if (!op.success) {
    return {
      result: `No pude ejecutar ${toolName}: ${op.message}`,
      actionPerformed: null,
      data: null,
    };
  }

  return {
    result: op.message || `Acción ${toolName} completada`,
    actionPerformed: toolName,
    data: op.data ?? null,
  };
};

const tryRunToolFromJson = async ({ content, userId }) => {
  const parsed = extractJson(content);
  if (!parsed || !parsed.tool) return null;
  if (!toolRegistry[parsed.tool]) return new OperationResult(false, `Herramienta desconocida: ${parsed.tool}`);

  const args = parsed.input || parsed.args || parsed.arguments || {};
  return await executeTool({ name: parsed.tool, args, userId });
};

const MAX_HISTORY_MESSAGES = 20;
const FALLBACK_RESPONSE = "No pude generar una respuesta útil por ahora.";

const mapHistory = (conversationHistory) =>
  conversationHistory
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({
      role: role === "bot" ? "assistant" : "user",
      content,
    }));

export const orchestrator = async ({ message, userId, intent, contextData, conversationHistory = [], userRole = "student", userProfile = null }) => {
  const started = Date.now();
  const system = buildOrchestratorSystemPrompt({ userId, intent, contextData, userRole, userProfile });
  const historyMessages = mapHistory(conversationHistory);

  // Conversational path (no tool needed) → Gemini Flash (fast + cheap)
  const replyWithFast = async () => {
    const systemPrompt =
      "Te llamas Captus. Eres un asistente académico amable y directo. " +
      "Responde de forma breve y útil en español.";

    const response = await createChatCompletion({
      model: MODEL_FAST,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.4,
    }, { purpose: "fast" });
    const content = response.choices?.[0]?.message?.content?.trim() || "";
    return { result: content, actionPerformed: null, data: null };
  };

  if (intent === "general") {
    return await replyWithFast();
  }

  // ── Agentic loop: up to 4 iterations so LLM can chain tools (list → delete, etc.)
  const MAX_STEPS = 4;
  const messages = [
    { role: "system", content: system },
    ...historyMessages,
    { role: "user", content: message },
  ];

  let lastActionPerformed = null;
  let lastData = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await createChatCompletion({
      model: MODEL_REASON,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.2,
    }, { purpose: "reason" });

    const aiMessage = response.choices?.[0]?.message;
    const duration = Date.now() - started;

    // Always push the assistant message so the next iteration has context
    messages.push(aiMessage);

    // 1) Tool calls (structured) — execute and feed result back
    if (aiMessage?.tool_calls?.length) {
      const call = aiMessage.tool_calls[0];
      const toolName = call.function.name;
      const args = normalizeToolArgs(call.function.arguments);

      console.info("[AI/orchestrator] tool_call", { userId, toolName, step, ms: duration });
      const result = await executeTool({ name: toolName, args, userId });

      // Track the most recent meaningful action
      if (result?.success !== false) {
        lastActionPerformed = toolName;
        lastData = result?.data ?? null;
      }

      // Feed tool result back so the LLM can continue reasoning
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({
          success: result?.success ?? true,
          message: result?.message ?? String(result),
          data: result?.data ?? null,
        }),
      });
      continue; // Let LLM decide next step
    }

    // 2) No more tool calls — LLM is giving a final text response
    const content = aiMessage?.content?.trim() || "";

    // Try JSON fallback (legacy path)
    const jsonResult = await tryRunToolFromJson({ content, userId });
    if (jsonResult) {
      const toolName = extractJson(content)?.tool;
      return renderOperationResult(toolName, jsonResult);
    }

    if (content) {
      console.info("[AI/orchestrator] final_response", { userId, step, ms: duration });
      return { result: content, actionPerformed: lastActionPerformed, data: lastData };
    }

    break;
  }

  // Fallback
  console.info("[AI/orchestrator] fast_fallback", { userId, ms: Date.now() - started });
  const fastResponse = await replyWithFast();
  if (fastResponse.result) return fastResponse;
  return { result: FALLBACK_RESPONSE, actionPerformed: lastActionPerformed, data: lastData };
};
