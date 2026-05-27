/**
 * Probe which Gemini model names actually work with this API key.
 * Also tests gemini-2.5-flash WITH tools to confirm if that was the real issue.
 */
import 'dotenv/config';
import { gemini } from '../src/ai/model.js';
import { toolDefinitions } from '../src/ai/toolRegistry.js';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

const probe = async (model, params = {}) => {
  try {
    const res = await gemini.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Di "ok"' }],
      temperature: 1,
      ...params,
    });
    const content = res.choices?.[0]?.message?.content ?? '(no content)';
    const hasToolCall = !!res.choices?.[0]?.message?.tool_calls?.length;
    return { ok: true, content: content.slice(0, 80), hasToolCall };
  } catch (err) {
    return { ok: false, status: err.status, message: err.message };
  }
};

console.log(`\n${BOLD}═══════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Gemini Model Availability Probe${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════${RESET}\n`);

const models = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
];

for (const model of models) {
  process.stdout.write(`${CYAN}${model.padEnd(45)}${RESET}`);
  const r = await probe(model);
  if (r.ok) {
    console.log(`${GREEN}✓ OK${RESET}  "${r.content}"`);
  } else {
    console.log(`${RED}✗ ${r.status ?? '???'}${RESET}  ${r.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Now test gemini-2.5-flash WITH tools (the original failing scenario)
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}─── gemini-2.5-flash + function calling ──────${RESET}\n`);

const toolTests = [
  { label: 'tools only (no tool_choice, temp=0.2)',  params: { tools: toolDefinitions, temperature: 0.2 } },
  { label: 'tools + tool_choice:"auto" (temp=0.2)',  params: { tools: toolDefinitions, tool_choice: 'auto', temperature: 0.2 } },
  { label: 'tools only (no tool_choice, temp=1)',    params: { tools: toolDefinitions, temperature: 1 } },
  { label: 'tools + tool_choice:"auto" (temp=1)',    params: { tools: toolDefinitions, tool_choice: 'auto', temperature: 1 } },
  { label: 'tools + tool_choice:"none"',             params: { tools: toolDefinitions, tool_choice: 'none' } },
];

for (const { label, params } of toolTests) {
  process.stdout.write(`  ${label.padEnd(50)}`);
  const r = await probe('gemini-2.5-flash', params);
  if (r.ok) {
    const info = r.hasToolCall ? `${YELLOW}tool_call${RESET}` : `text: "${r.content}"`;
    console.log(`${GREEN}✓ OK${RESET}  ${info}`);
  } else {
    console.log(`${RED}✗ ${r.status ?? '???'}${RESET}  ${r.message}`);
  }
}

console.log('');
