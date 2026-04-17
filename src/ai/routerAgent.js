import { together, MODEL_FAST } from "./model.js";
import { allowedIntents, buildRouterSystemPrompt, resolveContextPrefix } from "./prompts.js";
import { orchestrator } from "./orchestrator.js";
import { extractJson } from "./utils/json.js";
import { fetchContextForIntent } from "./context.js";

export const routerAgent = async (message, userId) => {
  const started = Date.now();

  // 1. Clasificación rápida con modelo 8B (Groq/Together Fast)
  const classification = await together.chat.completions.create({
    model: MODEL_FAST,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildRouterSystemPrompt() },
      { role: "user", content: message },
    ],
    temperature: 0.1,
  });

  const rawContent = classification.choices?.[0]?.message?.content || "{}";
  const parsed = extractJson(rawContent) || {};
  const intent = allowedIntents.includes(parsed.intent) ? parsed.intent : "general";

  // 2. Pre-fetch de datos (RAG-lite)
  // Si el usuario pregunta "¿Qué tareas tengo?", traemos las tareas y las inyectamos.
  // Esto evita que el orquestador tenga que llamar a la tool "list_tasks".
  const dynamicContext = await fetchContextForIntent(intent, userId);
  const contextPrefix = resolveContextPrefix(intent);

  console.info("[AI/router] classified", {
    userId,
    intent,
    hasContext: !!dynamicContext,
    ms: Date.now() - started,
  });

  return orchestrator({
    message: `${contextPrefix} ${message}`,
    userId,
    intent,
    contextData: dynamicContext
  });
};
