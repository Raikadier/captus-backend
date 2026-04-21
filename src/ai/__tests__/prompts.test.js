import {
  allowedIntents,
  resolveContextPrefix,
  buildRouterSystemPrompt,
  buildOrchestratorSystemPrompt,
} from '../prompts.js';

// ── allowedIntents ────────────────────────────────────────────────────────────

describe('allowedIntents', () => {
  const EXPECTED = [
    'tasks', 'notes', 'events', 'study',
    'teacher_analytics', 'teacher_content',
    'notifications', 'general',
  ];

  it('contains all expected intents', () => {
    EXPECTED.forEach((intent) => {
      expect(allowedIntents).toContain(intent);
    });
  });

  it('has exactly the expected number of intents', () => {
    expect(allowedIntents).toHaveLength(EXPECTED.length);
  });
});

// ── resolveContextPrefix ──────────────────────────────────────────────────────

describe('resolveContextPrefix', () => {
  it('returns the correct prefix for each valid intent', () => {
    expect(resolveContextPrefix('tasks')).toBe('[CTX_TAREAS]');
    expect(resolveContextPrefix('notes')).toBe('[CTX_NOTAS]');
    expect(resolveContextPrefix('events')).toBe('[CTX_EVENTOS]');
    expect(resolveContextPrefix('study')).toBe('[CTX_ESTUDIO]');
    expect(resolveContextPrefix('teacher_analytics')).toBe('[CTX_ANALITICA_DOCENTE]');
    expect(resolveContextPrefix('teacher_content')).toBe('[CTX_CONTENIDO_DOCENTE]');
    expect(resolveContextPrefix('notifications')).toBe('[CTX_NOTIFICACIONES]');
    expect(resolveContextPrefix('general')).toBe('[CTX_GENERAL]');
  });

  it('falls back to [CTX_GENERAL] for unknown intents', () => {
    expect(resolveContextPrefix('unknown_intent')).toBe('[CTX_GENERAL]');
    expect(resolveContextPrefix('')).toBe('[CTX_GENERAL]');
    expect(resolveContextPrefix(undefined)).toBe('[CTX_GENERAL]');
  });
});

// ── buildRouterSystemPrompt ───────────────────────────────────────────────────

describe('buildRouterSystemPrompt', () => {
  let prompt;

  beforeAll(() => {
    prompt = buildRouterSystemPrompt();
  });

  it('returns a non-empty string', () => {
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  it('instructs the model to reply ONLY with JSON', () => {
    expect(prompt).toMatch(/ÚNICAMENTE.*JSON|JSON.*ÚNICAMENTE/i);
  });

  it('lists the expected JSON format keys', () => {
    expect(prompt).toContain('"intent"');
    expect(prompt).toContain('"reason"');
    expect(prompt).toContain('"context_prefix"');
  });

  it('includes all valid intent names', () => {
    allowedIntents.forEach((intent) => {
      expect(prompt).toContain(intent);
    });
  });
});

// ── buildOrchestratorSystemPrompt ─────────────────────────────────────────────

describe('buildOrchestratorSystemPrompt', () => {
  const BASE_ARGS = {
    userId: 'user-123',
    intent: 'tasks',
    contextData: null,
    userRole: 'student',
  };

  it('returns a non-empty string', () => {
    const prompt = buildOrchestratorSystemPrompt(BASE_ARGS);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('includes the userId in the prompt', () => {
    const prompt = buildOrchestratorSystemPrompt(BASE_ARGS);
    expect(prompt).toContain('user-123');
  });

  it('includes the resolved context prefix', () => {
    const prompt = buildOrchestratorSystemPrompt(BASE_ARGS);
    expect(prompt).toContain('[CTX_TAREAS]');
  });

  it('shows MODO ESTUDIANTE for student role', () => {
    const prompt = buildOrchestratorSystemPrompt({ ...BASE_ARGS, userRole: 'student' });
    expect(prompt).toContain('MODO ESTUDIANTE');
  });

  it('shows MODO DOCENTE for teacher role', () => {
    const prompt = buildOrchestratorSystemPrompt({ ...BASE_ARGS, userRole: 'teacher' });
    expect(prompt).toContain('MODO DOCENTE');
  });

  it('includes contextData section when data is provided', () => {
    const prompt = buildOrchestratorSystemPrompt({
      ...BASE_ARGS,
      contextData: 'Tarea: Cálculo — vence el 2025-01-15',
    });
    expect(prompt).toContain('DATOS ACTUALES');
    expect(prompt).toContain('Cálculo');
  });

  it('does NOT include actual context data when contextData is null', () => {
    // NOTE: "DATOS ACTUALES" appears in the RULES section regardless.
    // When contextData is null the data block is omitted, so no user content appears.
    const prompt = buildOrchestratorSystemPrompt({ ...BASE_ARGS, contextData: null });
    // The data section marker "DATOS ACTUALES:\n" is what should be absent.
    expect(prompt).not.toMatch(/DATOS ACTUALES:\n/);
  });

  it('defaults to student role when userRole is omitted', () => {
    const { userRole: _, ...noRole } = BASE_ARGS;
    const prompt = buildOrchestratorSystemPrompt(noRole);
    expect(prompt).toContain('MODO ESTUDIANTE');
  });

  it('uses [CTX_GENERAL] prefix for unknown intent', () => {
    const prompt = buildOrchestratorSystemPrompt({ ...BASE_ARGS, intent: 'nonexistent' });
    expect(prompt).toContain('[CTX_GENERAL]');
  });

  it('always instructs the model to respond in Spanish', () => {
    const prompt = buildOrchestratorSystemPrompt(BASE_ARGS);
    expect(prompt).toMatch(/responde.*español|español/i);
  });
});
