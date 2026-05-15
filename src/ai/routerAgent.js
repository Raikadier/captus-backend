import { createChatCompletion, MODEL_FAST } from "./model.js";
import { allowedIntents, buildRouterSystemPrompt } from "./prompts.js";
import { orchestrator } from "./orchestrator.js";
import { extractJson } from "./utils/json.js";
import { fetchContextForIntent } from "./context.js";
import { requireSupabaseClient } from "../lib/supabaseAdmin.js";

// Fetch basic profile once per request — name + institution for personalisation.
const fetchUserProfile = async (userId) => {
  try {
    const supabase = requireSupabaseClient();
    const { data } = await supabase
      .from("users")
      .select("name, role, institutions!users_institution_id_fkey(name)")
      .eq("id", userId)
      .single();

    if (!data) return null;
    return {
      name:        data.name ?? null,
      role:        data.role ?? "student",
      institution: data.institutions?.name ?? null,
    };
  } catch {
    return null;
  }
};

export const routerAgent = async (message, userId, conversationHistory = [], userRole = "student") => {
  const started = Date.now();

  // 1. Fetch user profile + classify intent in parallel
  const [profileResult, classification] = await Promise.all([
    fetchUserProfile(userId),
    createChatCompletion({
      model: MODEL_FAST,
      // response_format omitted: Gemini 2.5 Flash rejects `json_object` on the
      // OpenAI-compat layer (same issue as tool_choice in orchestrator).
      // The system prompt already instructs the model to respond only with JSON,
      // and extractJson() handles stripping any markdown fences from the output.
      messages: [
        { role: "system", content: buildRouterSystemPrompt() },
        { role: "user", content: message },
      ],
      temperature: 0.1,
    }, { purpose: "fast" }),
  ]);

  const rawContent = classification.choices?.[0]?.message?.content || "{}";
  const parsed = extractJson(rawContent) || {};
  const intent = allowedIntents.includes(parsed.intent) ? parsed.intent : "general";

  // 2. Pre-fetch de datos (RAG-lite)
  const dynamicContext = await fetchContextForIntent(intent, userId, userRole);

  console.info("[AI/router] classified", {
    userId,
    userName: profileResult?.name,
    intent,
    hasContext: !!dynamicContext,
    ms: Date.now() - started,
  });

  return await orchestrator({
    message,
    userId,
    intent,
    contextData: dynamicContext,
    conversationHistory,
    userRole,
    userProfile: profileResult,
  });
};
