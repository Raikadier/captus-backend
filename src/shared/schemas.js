import { z } from 'zod';

// ── Reusable primitives ────────────────────────────────────────────────────────

const isoDate = z.string().datetime({ message: 'Debe ser una fecha ISO 8601 válida.' });
const optionalIsoDate = isoDate.optional();
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
  conversationId: z.string().uuid().optional(),
});

// ── Tasks ──────────────────────────────────────────────────────────────────────

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = ['pending', 'in_progress', 'completed'];

export const CreateTaskSchema = z.object({
  title:       shortStr('El título'),
  description: z.string().max(2000).optional(),
  priority:    z.enum(PRIORITIES, { message: `Prioridad debe ser: ${PRIORITIES.join(', ')}.` }).optional(),
  status:      z.enum(STATUSES).optional(),
  dueDate:     optionalIsoDate,
  courseId:    z.string().optional(),
  groupId:     z.string().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

// ── Events ─────────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['class', 'exam', 'assignment', 'personal', 'other'];

const _EventBase = z.object({
  title:       shortStr('El título'),
  description: z.string().max(2000).optional(),
  startDate:   isoDate,
  endDate:     optionalIsoDate,
  type:        z.enum(EVENT_TYPES).optional(),
  courseId:    z.string().optional(),
});

const _dateCheck = (d) => !d.endDate || !d.startDate || new Date(d.endDate) >= new Date(d.startDate);
const _dateMsg   = { message: 'La fecha de fin no puede ser anterior a la de inicio.', path: ['endDate'] };

export const CreateEventSchema = _EventBase.refine(_dateCheck, _dateMsg);
export const UpdateEventSchema = _EventBase.partial().refine(_dateCheck, _dateMsg);

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
