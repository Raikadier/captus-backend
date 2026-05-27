/**
 * Deep test: replicate the EXACT orchestrator call that was returning 400.
 * Uses the real system prompt builder + real context fetcher.
 */
import 'dotenv/config';
import { gemini, MODEL_FAST, MODEL_REASON } from '../src/ai/model.js';
import { toolDefinitions } from '../src/ai/toolRegistry.js';
import { buildOrchestratorSystemPrompt, buildRouterSystemPrompt, allowedIntents } from '../src/ai/prompts.js';
import { fetchContextForIntent } from '../src/ai/context.js';
import { extractJson } from '../src/ai/utils/json.js';

const TEST_USER_ID = '503c7ae0-77a8-4a03-bf90-2b6cdd95a43a';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0; let failed = 0;

const run = async (label, fn) => {
  process.stdout.write(`\n${CYAN}▶ ${label}${RESET}\n`);
  const t = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t;
    console.log(`${GREEN}  ✓ PASSED${RESET} (${ms}ms)`);
    if (result !== undefined) {
      const preview = JSON.stringify(result).slice(0, 300);
      console.log(`  ${preview}${preview.length >= 300 ? '…' : ''}`);
    }
    passed++;
  } catch (err) {
    const ms = Date.now() - t;
    console.log(`${RED}  ✗ FAILED${RESET} (${ms}ms)`);
    console.log(`  ${RED}status ${err.status ?? '?'}: ${err.message}${RESET}`);
    const inner = err.error?.error ?? err.error;
    if (inner) console.log(`  ${YELLOW}Gemini body: ${JSON.stringify(inner).slice(0, 500)}${RESET}`);
    failed++;
  }
};

console.log(`\n${BOLD}═══════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Captus AI — Deep Orchestrator Tests${RESET}`);
console.log(`${BOLD}  FAST=${MODEL_FAST}  REASON=${MODEL_REASON}${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════${RESET}`);

// ── Step 1: Classify intent (router) ─────────────────────────────────────────
const classifyIntent = async (message) => {
  const res = await gemini.chat.completions.create({
    model: MODEL_FAST,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildRouterSystemPrompt() },
      { role: 'user', content: message },
    ],
    temperature: 0.1,
  });
  const parsed = extractJson(res.choices[0]?.message?.content || '{}') || {};
  return allowedIntents.includes(parsed.intent) ? parsed.intent : 'general';
};

// ── Step 2: Build full orchestrator payload and call Gemini ──────────────────
const testOrchestrator = async (message, userRole = 'student') => {
  const intent = await classifyIntent(message);
  console.log(`    → classified intent: ${YELLOW}${intent}${RESET}`);

  const contextData = await fetchContextForIntent(intent, TEST_USER_ID, userRole);
  console.log(`    → context length: ${contextData?.length ?? 0} chars`);

  const systemPrompt = buildOrchestratorSystemPrompt({
    intent,
    contextData,
    userRole,
    userProfile: { name: 'Sasuke Uchiha', role: userRole, institution: 'Test U' },
  });
  console.log(`    → system prompt length: ${systemPrompt.length} chars`);

  // This is the EXACT call that orchestrator.js makes
  const res = await gemini.chat.completions.create({
    model: MODEL_REASON,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    tools: toolDefinitions,
    temperature: 0.2,
  });

  const msg = res.choices[0]?.message;
  return {
    intent,
    hasText: !!msg?.content,
    hasToolCall: !!msg?.tool_calls?.length,
    toolName: msg?.tool_calls?.[0]?.function?.name ?? null,
    text: msg?.content?.slice(0, 100) ?? null,
  };
};

// ── Tests ─────────────────────────────────────────────────────────────────────
await run('Full orchestrator — listar tareas (student)', async () => {
  return testOrchestrator('Muéstrame mis tareas pendientes', 'student');
});

await run('Full orchestrator — crear tarea (student)', async () => {
  return testOrchestrator('Crea una tarea de prueba para el 2026-12-31', 'student');
});

await run('Full orchestrator — notas (student)', async () => {
  return testOrchestrator('Muéstrame mis notas', 'student');
});

await run('Full orchestrator — eventos (student)', async () => {
  return testOrchestrator('¿Qué eventos tengo próximos?', 'student');
});

await run('Full orchestrator — analytics docente (teacher)', async () => {
  return testOrchestrator('Dame el promedio de mis estudiantes', 'teacher');
});

await run('Full orchestrator — pregunta general (→ no tools)', async () => {
  return testOrchestrator('¿Cómo puedo estudiar mejor para un examen?', 'student');
});

// ── Check: what if contextData is very long? ──────────────────────────────────
await run('Stress: huge system prompt (5000 chars of context)', async () => {
  const fakeContext = '- Tarea de prueba '.repeat(200); // ~3600 chars
  const systemPrompt = buildOrchestratorSystemPrompt({
    intent: 'tasks',
    contextData: fakeContext,
    userRole: 'student',
    userProfile: { name: 'Test User', role: 'student', institution: null },
  });
  console.log(`    → system prompt length: ${systemPrompt.length} chars`);

  const res = await gemini.chat.completions.create({
    model: MODEL_REASON,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Muéstrame las tareas' },
    ],
    tools: toolDefinitions,
    temperature: 0.2,
  });

  const msg = res.choices[0]?.message;
  return {
    hasText: !!msg?.content,
    hasToolCall: !!msg?.tool_calls?.length,
    toolName: msg?.tool_calls?.[0]?.function?.name ?? null,
  };
});

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${BOLD}═══════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Results: ${GREEN}${passed} passed${RESET}${BOLD} / ${RED}${failed} failed${RESET}${BOLD} / ${total} total${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════${RESET}\n`);
process.exit(failed > 0 ? 1 : 0);
