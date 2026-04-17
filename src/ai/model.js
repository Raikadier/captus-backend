import OpenAI from "openai";

export const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: "https://api.together.xyz/v1",
});

// Opcional para chat ultrarrapido
export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const MODEL_REASONING = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
export const MODEL_FAST = "llama-3.1-8b-instant";
