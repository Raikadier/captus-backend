/**
 * Real end-to-end test for the AI module.
 * Runs against the actual Gemini API — no mocks.
 *
 * Usage:
 *   node --env-file=.env scripts/test-ai-real.js
 *   node -r dotenv/config scripts/test-ai-real.js   (if --env-file not supported)
 */

// ── IMPORTANT: env must be loaded BEFORE any AI module is imported ────────────
import 'dotenv/config';
import { createChatCompletion, MODEL_FAST, MODEL_REASON } from '../src/ai/model.js';
import { routerAgent } from '../src/ai/routerAgent.js';
import { toolDefinitions } from '../src/ai/toolRegistry.js';

// User ID from the dev database (sasuke@captus.app)
const TEST_USER_ID = '503c7ae0-77a8-4a03-bf90-2b6cdd95a43a';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0;
let failed = 0;

const run = async (label, fn) => {
  process.stdout.write(`\n${CYAN}▶ ${label}${RESET}\n`);
  const t = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t;
    console.log(`${GREEN}  ✓ PASSED${RESET} (${ms}ms)`);
    if (result !== undefined) {
      const preview = JSON.stringify(result).slice(0, 200);
      console.log(`  ${preview}${preview.length >= 200 ? '…' : ''}`);
    }
    passed++;
  } catch (err) {
    const ms = Date.now() - t;
    console.log(`${RED}  ✗ FAILED${RESET} (${ms}ms)`);
    // Print full Gemini error details
    console.log(`  ${RED}Error: ${err.message}${RESET}`);
    if (err.status)   console.log(`  status:  ${err.status}`);
    if (err.code)     console.log(`  code:    ${err.code}`);
    if (err.error)    console.log(`  body:    ${JSON.stringify(err.error).slice(0, 500)}`);
    if (err.cause)    console.log(`  cause:   ${err.cause}`);
    // OpenAI SDK wraps Gemini errors in err.error?.error
    const inner = err.error?.error ?? err.error;
    if (inner) console.log(`  ${YELLOW}Gemini detail: ${JSON.stringify(inner).slice(0, 500)}${RESET}`);
    failed++;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}═══════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Captus AI — Real API Tests${RESET}`);
console.log(`${BOLD}  Models: FAST=${MODEL_FAST}  REASON=${MODEL_REASON}${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════${RESET}`);

// ── 1. Basic connectivity ─────────────────────────────────────────────────────
await run('MODEL_FAST — simple completion (no tools)', async () => {
  const res = await createChatCompletion({
    model: MODEL_FAST,
    messages: [
      { role: 'system', content: 'Responde en una frase.' },
      { role: 'user',   content: '¿Cuánto es 2+2?' },
    ],
    temperature: 0.1,
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('Empty response');
  return text;
});

await run('MODEL_FAST — JSON mode (intent classification)', async () => {
  const res = await createChatCompletion({
    model: MODEL_FAST,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Clasifica la intención. Responde JSON: {"intent":"<valor>"}.' },
      { role: 'user',   content: 'Crea una tarea para mañana' },
    ],
    temperature: 0.1,
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('Empty response');
  const parsed = JSON.parse(text);
  if (!parsed.intent) throw new Error('No intent field');
  return parsed;
});

// ── 2. MODEL_REASON — function calling (the problematic path) ─────────────────
await run('MODEL_REASON — completion WITHOUT tools', async () => {
  const res = await createChatCompletion({
    model: MODEL_REASON,
    messages: [
      { role: 'system', content: 'Eres un asistente.' },
      { role: 'user',   content: '¿Qué es machine learning?' },
    ],
    temperature: 0.2,
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('Empty response');
  return text.slice(0, 100);
});

await run('MODEL_REASON — WITH tools (no tool_choice)', async () => {
  const res = await createChatCompletion({
    model: MODEL_REASON,
    messages: [
      { role: 'system', content: 'Eres un asistente académico. Usa las herramientas disponibles.' },
      { role: 'user',   content: 'Lista mis tareas pendientes' },
    ],
    tools: toolDefinitions,
    temperature: 0.2,
  });
  const msg = res.choices[0]?.message;
  if (!msg) throw new Error('Empty response');
  return {
    hasContent:   !!msg.content,
    hasToolCalls: !!msg.tool_calls?.length,
    toolName:     msg.tool_calls?.[0]?.function?.name ?? null,
  };
});

await run('MODEL_REASON — WITH tools AND tool_choice:"auto"', async () => {
  const res = await createChatCompletion({
    model: MODEL_REASON,
    messages: [
      { role: 'system', content: 'Eres un asistente académico. Usa las herramientas disponibles.' },
      { role: 'user',   content: 'Lista mis tareas pendientes' },
    ],
    tools: toolDefinitions,
    tool_choice: 'auto',
    temperature: 0.2,
  });
  const msg = res.choices[0]?.message;
  if (!msg) throw new Error('Empty response');
  return {
    hasContent:   !!msg.content,
    hasToolCalls: !!msg.tool_calls?.length,
    toolName:     msg.tool_calls?.[0]?.function?.name ?? null,
  };
});

// ── 3. Full routerAgent (end-to-end) ─────────────────────────────────────────
await run('routerAgent — pregunta simple (intent:general)', async () => {
  const res = await routerAgent(
    '¿Cómo puedo mejorar mi productividad estudiantil?',
    TEST_USER_ID,
    [],
    'student'
  );
  if (!res.result) throw new Error('No result');
  return { result: res.result.slice(0, 100), steps: res.steps };
});

await run('routerAgent — acción: listar tareas (intent:tasks)', async () => {
  const res = await routerAgent(
    'Muéstrame mis tareas pendientes',
    TEST_USER_ID,
    [],
    'student'
  );
  if (!res.result) throw new Error('No result');
  return { result: res.result.slice(0, 150), action: res.actionPerformed, steps: res.steps };
});

await run('routerAgent — acción: crear tarea (intent:tasks)', async () => {
  const res = await routerAgent(
    'Crea una tarea llamada "Test API" para el 2026-12-31',
    TEST_USER_ID,
    [],
    'student'
  );
  if (!res.result) throw new Error('No result');
  return { result: res.result.slice(0, 150), action: res.actionPerformed };
});

await run('routerAgent — acción: estadísticas de curso (intent:teacher)', async () => {
  const res = await routerAgent(
    'Dame el promedio de calificaciones de mis estudiantes',
    TEST_USER_ID,
    [],
    'teacher'
  );
  if (!res.result) throw new Error('No result');
  return { result: res.result.slice(0, 150), action: res.actionPerformed, steps: res.steps };
});

await run('routerAgent — acción: listar notas (intent:notes)', async () => {
  const res = await routerAgent(
    'Muéstrame mis notas',
    TEST_USER_ID,
    [],
    'student'
  );
  if (!res.result) throw new Error('No result');
  return { result: res.result.slice(0, 150), action: res.actionPerformed };
});

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${BOLD}═══════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Results: ${GREEN}${passed} passed${RESET}${BOLD} / ${RED}${failed} failed${RESET}${BOLD} / ${total} total${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════${RESET}\n`);

process.exit(failed > 0 ? 1 : 0);
