/**
 * AI model configuration — Phase 2: Gemini via OpenAI-compatible endpoint.
 *
 * We use the `openai` npm package pointed at Google's compatibility layer so
 * the rest of the codebase (orchestrator, routerAgent) needs zero changes.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/openai
 *
 * Models:
 *  - FAST   → gemini-2.0-flash  (replaces Groq llama-3.1-8b)
 *              ~200ms p50, supports function calling, JSON mode
 *  - REASON → gemini-2.5-pro    (replaces Together llama-3.1-70B)
 *              1M context window, best function calling accuracy
 *
 * Legacy fallbacks (TOGETHER_API_KEY / GROQ_API_KEY) are kept so the app
 * degrades gracefully if GEMINI_API_KEY is not yet set in an environment.
 */

import OpenAI from "openai";

// ── Gemini via OpenAI-compatible endpoint ─────────────────────────────────────
const geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();

if (!geminiApiKey) {
  console.warn('[AI/model] GEMINI_API_KEY no está configurada — las llamadas a Gemini fallarán.');
}

export const gemini = new OpenAI({
  apiKey: geminiApiKey || "missing-key",
  baseURL: geminiBaseURL,
});

/** Fast model: intent classification, conversational turns. */
export const MODEL_FAST = "gemini-2.5-flash";

/** Reasoning model: tool orchestration, complex multi-step tasks. */
// gemini-2.5-flash has thinking capabilities and completes in 5-15s (vs 40-90s for 2.5-pro),
// which keeps Vercel serverless functions well within timeout limits.
export const MODEL_REASON = "gemini-2.5-flash";

/**
 * Study model: 1M-token context window for document ingestion.
 * Uses Pro only for study tasks where latency is acceptable.
 */
export const MODEL_STUDY = "gemini-2.5-pro";

// ── Legacy clients (fallback if GEMINI_API_KEY not set) ───────────────────────

export const together = process.env.TOGETHER_API_KEY
  ? new OpenAI({
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://api.together.xyz/v1",
    })
  : gemini; // fall through to Gemini

export const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : gemini; // fall through to Gemini

/**
 * @deprecated Use `gemini` + `MODEL_FAST` / `MODEL_REASON` directly.
 * Kept for backwards-compat with code that hasn't been migrated yet.
 */
export const MODEL_REASONING = MODEL_REASON;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => RETRYABLE_STATUS_CODES.has(error?.status);

const toPurpose = (model, purpose) => {
  if (purpose) return purpose;
  if (model === MODEL_FAST) return "fast";
  if (model === MODEL_STUDY) return "study";
  return "reason";
};

const fallbackModelFor = (provider, purpose) => {
  if (provider === "groq") {
    if (purpose === "fast") return "llama-3.1-8b-instant";
    return "llama-3.1-70b-versatile";
  }
  if (provider === "together") {
    if (purpose === "fast") return "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";
    return "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
  }
  return null;
};

const fallbackProviders = () => {
  const providers = [];
  if (process.env.GROQ_API_KEY) providers.push({ name: "groq", client: groq });
  if (process.env.TOGETHER_API_KEY) providers.push({ name: "together", client: together });
  return providers;
};

/**
 * Resilient wrapper for chat completions:
 * - retries transient Gemini outages (503/429/5xx)
 * - optionally falls back to Groq/Together if configured
 */
export const createChatCompletion = async (params, options = {}) => {
  const { provider = "gemini", purpose } = options;

  if (provider !== "gemini") {
    return gemini.chat.completions.create(params);
  }

  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await gemini.chat.completions.create(params);
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === RETRY_DELAYS_MS.length) {
        break;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!isRetryableError(lastError)) {
    throw lastError;
  }

  const resolvedPurpose = toPurpose(params.model, purpose);
  for (const providerCfg of fallbackProviders()) {
    const fallbackModel = fallbackModelFor(providerCfg.name, resolvedPurpose);
    if (!fallbackModel) continue;
    try {
      console.warn("[AI/model] fallback_provider", {
        from: "gemini",
        to: providerCfg.name,
        reason: lastError?.status || "error",
      });
      return await providerCfg.client.chat.completions.create({
        ...params,
        model: fallbackModel,
      });
    } catch (fallbackError) {
      lastError = fallbackError;
    }
  }

  throw lastError;
};
