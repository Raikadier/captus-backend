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

export const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "missing-key",
  baseURL: geminiBaseURL,
});

/** Fast model: intent classification, conversational turns. */
export const MODEL_FAST = "gemini-2.0-flash";

/** Reasoning model: tool orchestration, complex multi-step tasks. */
export const MODEL_REASON = "gemini-2.5-pro";

/**
 * Study model: same as REASON but we reference it explicitly so callers
 * know they're using the 1M-token context window for document ingestion.
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
