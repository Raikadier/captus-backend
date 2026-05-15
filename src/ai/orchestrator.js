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

const tryRunToolFromJson = async ({ content, userId, userRole = "student" }) => {
  const parsed = extractJson(content);
  if (!parsed || !parsed.tool) return null;
  if (!toolRegistry[parsed.tool]) return new OperationResult(false, `Herramienta desconocida: ${parsed.tool}`);

  const args = parsed.input || parsed.args || parsed.arguments || {};
  return await executeTool({ name: parsed.tool, args, userId, userRole });
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
  const replyWithFast = async (systemOverride) => {
    const systemPrompt = systemOverride ??
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
    const r = await replyWithFast(system);
    return { ...r, steps: [] };
  }

  // MAX_STEPS = N tool calls + 1 final answer; 6 handles up to 5 chained tools.
  const MAX_STEPS = 6;
  const messages = [
    { role: "system", content: system },
    ...historyMessages,
    { role: "user", content: message },
  ];

  let lastActionPerformed = null;
  let lastData = null;
  const steps = []; // Reasoning trail exposed to the client

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await createChatCompletion({
      model: MODEL_REASON,
      messages,
      tools: toolDefinitions,
      // tool_choice omitted: Gemini defaults to "auto" and some model versions
      // reject the explicit parameter, causing a 400 on the OpenAI-compat layer.
      temperature: 0.2,
    }, { purpose: "reason" });

    const aiMessage = response.choices?.[0]?.message;
    const duration = Date.now() - started;

    if (!aiMessage) break; // Gemini returned no message — exit loop
    messages.push(aiMessage);

    // 1) Tool calls — execute and record as a reasoning step
    if (aiMessage?.tool_calls?.length) {
      for (const call of aiMessage.tool_calls) {
        const toolName = call.function.name;
        const args = normalizeToolArgs(call.function.arguments);

        console.info("[AI/orchestrator] tool_call", { userId, toolName, step, ms: Date.now() - started });
        const result = await executeTool({ name: toolName, args, userId, userRole });

        const success = result instanceof OperationResult ? result.success : false;
        if (success) {
          lastActionPerformed = toolName;
          lastData = result?.data ?? null;
        }

        steps.push({ type: "tool", name: toolName, success, ms: Date.now() - started });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            success,
            message: result?.message ?? String(result),
            data: result?.data ?? null,
          }),
        });
      }
      continue;
    }

    // 2) Final text response
    const content = aiMessage?.content?.trim() || "";

    // Only attempt JSON-path tool execution if no tool_calls have fired yet.
    // Prevents double-execution when the model narrates a tool call in its
    // final text response after already having used tool_calls.
    if (!steps.length) {
      const jsonResult = await tryRunToolFromJson({ content, userId, userRole });
      if (jsonResult) {
        const toolName = extractJson(content)?.tool;
        const rendered = renderOperationResult(toolName, jsonResult);
        steps.push({
          type: "tool",
          name: toolName ?? "unknown",
          success: jsonResult instanceof OperationResult ? jsonResult.success : jsonResult?.success !== false,
          ms: Date.now() - started,
        });
        return { ...rendered, steps };
      }
    }

    if (content) {
      console.info("[AI/orchestrator] final_response", { userId, step, ms: duration });
      return { result: content, actionPerformed: lastActionPerformed, data: lastData, steps };
    }

    break;
  }

  // Fallback
  console.info("[AI/orchestrator] fast_fallback", { userId, ms: Date.now() - started });
  const fastResponse = await replyWithFast(system);
  if (fastResponse.result) return { ...fastResponse, steps };
  return { result: FALLBACK_RESPONSE, actionPerformed: lastActionPerformed, data: lastData, steps };
};
