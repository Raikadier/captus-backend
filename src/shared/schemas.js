import { z } from 'zod';

// ── Reusable primitives ────────────────────────────────────────────────────────

const isoDate = z.string().datetime({ message: 'Debe ser una fecha ISO 8601 válida.' });
const optionalIsoDate = isoDate.optional();
// Accepts a full ISO 8601 datetime ("2026-06-10T00:00:00Z") OR a date-only
// string ("2026-06-10"). Clients (task form, quick-date buttons) send date-only,
// which z.string().datetime() rejects — causing a 400 on task create/update.
const flexibleDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Debe ser una fecha válida.' });
const optionalFlexibleDate = flexibleDate.optional();
const shortStr  = (label) => z.string({ required_error: `${label} es requerido.` }).min(1, `${label} no puede estar vacío.`).max(255);
const longStr   = (label) => z.string({ required_error: `${label} es requerido.` }).min(1).max(5000);

// ── AI ─────────────────────────────────────────────────────────────────────────

export const AiChatSchema = z.object({
  message: z
    .string({ required_error: 'El mensaje es requerido.' })
    .min(1, 'El mensaje no puede estar vacío.')
    // 4000 chars to accommodate study-mode messages:
    // "Genera X del siguiente documento:\n\n{content}" where content ≤ 3000.
    .max(4000, 'El mensaje no puede superar 4000 caracteres.'),
  // conversations.id is a bigint in the DB, not a UUID.
  // The client may send it as a string ("123"), a number (123), or null/""/"null"
  // for a brand-new conversation. Normalise any empty/null-ish value to undefined
  // so the handler creates a new conversation instead of querying id=eq.null
  // (which throws "invalid input syntax for type bigint").
  conversationId: z.preprocess(
    (v) =>
      v === null || v === undefined || v === '' || v === 'null' || v === 'undefined'
        ? undefined
        : String(v),
    z.string().min(1).optional()
  ),
});

// ── Tasks ──────────────────────────────────────────────────────────────────────

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = ['pending', 'in_progress', 'completed'];

// Accepts both camelCase (dueDate) and snake_case (due_date) from any client.
// Normalises to snake_case before the service layer sees it.
const _TaskFields = z.object({
  title:       shortStr('El título'),
  description: z.string().max(2000).optional(),
  priority:    z.enum(PRIORITIES, { message: `Prioridad debe ser: ${PRIORITIES.join(', ')}.` }).optional(),
  // The web client sends priority_id / category_id as integers (FK to priorities/categories
  // tables). Accept both the numeric FK form and the legacy string form so neither
  // is stripped by Zod, preventing a NOT NULL constraint violation on INSERT.
  priority_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  status:      z.enum(STATUSES).optional(),
  dueDate:     optionalFlexibleDate,
  due_date:    optionalFlexibleDate,
  completed:   z.boolean().optional(),
  courseId:    z.string().optional(),
  groupId:     z.string().optional(),
});

const _normalizeTask = (d) => ({ ...d, due_date: d.due_date ?? d.dueDate });

export const CreateTaskSchema = _TaskFields.transform(_normalizeTask);
export const UpdateTaskSchema  = _TaskFields.partial().transform(_normalizeTask);

// ── Events ─────────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['class', 'exam', 'assignment', 'personal', 'other'];

// Accepts both camelCase (startDate/endDate) and snake_case (start_date/end_date).
// Normalises to snake_case before the service layer sees it.
const _EventFields = z.object({
  title:       shortStr('El título'),
  description: z.string().max(2000).optional(),
  startDate:   isoDate.optional(),
  start_date:  isoDate.optional(),
  endDate:     optionalIsoDate,
  end_date:    optionalIsoDate,
  type:        z.enum(EVENT_TYPES).optional(),
  courseId:    z.string().optional(),
});

const _hasStart  = (d) => !!(d.startDate || d.start_date);
const _startMsg  = { message: 'La fecha de inicio es requerida.', path: ['start_date'] };

const _dateCheck = (d) => {
  const s = d.start_date ?? d.startDate;
  const e = d.end_date   ?? d.endDate;
  return !e || !s || new Date(e) >= new Date(s);
};
const _dateMsg = { message: 'La fecha de fin no puede ser anterior a la de inicio.', path: ['end_date'] };

const _normalizeEvent = (d) => ({
  ...d,
  start_date: d.start_date ?? d.startDate,
  end_date:   d.end_date   ?? d.endDate,
});

export const CreateEventSchema = _EventFields
  .refine(_hasStart,  _startMsg)
  .refine(_dateCheck, _dateMsg)
  .transform(_normalizeEvent);

export const UpdateEventSchema = _EventFields.partial()
  .refine(_dateCheck, _dateMsg)
  .transform(_normalizeEvent);

// ── Notes ──────────────────────────────────────────────────────────────────────

export const CreateNoteSchema = z.object({
  title:   shortStr('El título'),
  content: longStr('El contenido'),
  tags:    z.array(z.string().max(50)).max(10).optional(),
});

export const UpdateNoteSchema = CreateNoteSchema.partial();

// ── Courses ────────────────────────────────────────────────────────────────────

export const CreateCourseSchema = z.object({
  name:        shortStr('El nombre del curso'),
  code:        z.string().min(1).max(20).optional(),
  description: z.string().max(2000).optional(),
  teacherId:   z.string().uuid().optional(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial();

// ── Groups ─────────────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  name:        shortStr('El nombre del grupo'),
  description: z.string().max(1000).optional(),
  courseId:    z.string().uuid().optional(),
});

// ── Notifications ──────────────────────────────────────────────────────────────

export const RegisterTokenSchema = z.object({
  token:    z.string().min(10, 'Token FCM inválido.'),
  platform: z.enum(['android', 'ios', 'web']).optional(),
});

// ── Users ──────────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  name:        shortStr('El nombre').optional(),
  university:  z.string().max(255).optional(),
  career:      z.string().max(255).optional(),
  semester:    z.number().int().min(1).max(20).optional(),
  bio:         z.string().max(500).optional(),
  avatarUrl:   z.string().url('URL de avatar inválida.').optional(),
});
