import { together, groq, MODEL_REASONING, MODEL_FAST } from "./model.js";
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

const mapHistory = (conversationHistory) =>
  conversationHistory
    .slice(-MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({
      role: role === "bot" ? "assistant" : "user",
      content,
    }));

export const orchestrator = async ({ message, userId, intent, contextData, conversationHistory = [] }) => {
  const started = Date.now();
  const system = buildOrchestratorSystemPrompt({ userId, intent, contextData });
  const historyMessages = mapHistory(conversationHistory);

  // Conversational path (no agent/tool) -> Groq
  const replyWithGroq = async () => {
    const systemPrompt = "Te llamas Captus. Eres un asistente amable y directo. Responde de forma breve y útil.";

    const chatClient = process.env.GROQ_API_KEY ? groq : together;

    const response = await chatClient.chat.completions.create({
      model: MODEL_FAST,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.4,
    });
    const content = response.choices?.[0]?.message?.content?.trim() || "";
    return { result: content, actionPerformed: null, data: null };
  };

  if (intent === "general") {
    return await replyWithGroq();
  }

  const response = await together.chat.completions.create({
    model: MODEL_REASONING,
    messages: [
      { role: "system", content: system },
      ...historyMessages,
      { role: "user", content: message },
    ],
    tools: toolDefinitions,
    tool_choice: "auto",
    temperature: 0.2,
  });

  const aiMessage = response.choices?.[0]?.message;
  const duration = Date.now() - started;

  // 1) Tool calls (structured)
  if (aiMessage?.tool_calls?.length) {
    const call = aiMessage.tool_calls[0]; // single tool per turn
    const toolName = call.function.name;
    const args = normalizeToolArgs(call.function.arguments);

    console.info("[AI/orchestrator] tool_call", { userId, toolName, ms: duration });
    const result = await executeTool({ name: toolName, args, userId });
    return renderOperationResult(toolName, result);
  }

  const content = aiMessage?.content?.trim() || "No pude generar una respuesta útil por ahora.";

  // 2) JSON in content (fallback)
  const jsonResult = await tryRunToolFromJson({ content, userId });
  if (jsonResult) {
    const toolName = extractJson(content)?.tool;
    return renderOperationResult(toolName, jsonResult);
  }

  // 3) Conversación sin acción -> usar Groq para chat natural
  console.info("[AI/orchestrator] conversational turn (groq)", { userId, ms: duration });
  return await replyWithGroq();
};
