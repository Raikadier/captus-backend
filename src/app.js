import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import TaskRoutes from './routes/TaskRoutes.js';
import SubTaskRoutes from './routes/SubTaskRoutes.js';
import StatisticsRoutes from './routes/StatisticsRoutes.js';
import PriorityRoutes from './routes/PriorityRoutes.js';
import buildSupabaseAuthMiddleware from './middlewares/verifySupabaseToken.js';
import CategoryRoutes from './routes/CategoryRoutes.js';
import UserAchievementsRoutes from './routes/UserAchievementsRoutes.js';
import RolRoutes from './routes/RolRoutes.js';
import ProjectRoutes from './routes/ProjectRoutes.js';
import ProjectMemberRoutes from './routes/ProjectMemberRoutes.js';
import ProjectCommentRoutes from './routes/ProjectCommentRoutes.js';
import CommentLikeRoutes from './routes/CommentLikeRoutes.js';
import SubjectRoutes from './routes/SubjectRoutes.js';
import UserRoutes from './routes/UserRoutes.js';
import DiagramRoutes from './routes/DiagramRoutes.js';
import NotesRoutes from './routes/NotesRoutes.js';
import EventsRoutes from './routes/EventsRoutes.js';
import CourseRoutes from './routes/CourseRoutes.js';
import EnrollmentRoutes from './routes/EnrollmentRoutes.js';
import AssignmentRoutes from './routes/AssignmentRoutes.js';
import SubmissionRoutes from './routes/SubmissionRoutes.js';
import AcademicGroupRoutes from './routes/AcademicGroupRoutes.js';
import NotificationRoutes from './routes/NotificationRoutes.js';
import TelegramRoutes from './routes/TelegramRoutes.js';
import telegramController from './controllers/TelegramController.js';
import aiRouter from './routes/ai.js';
import AdminRoutes from './routes/AdminRoutes.js';
import SuperAdminRoutes from './routes/SuperAdminRoutes.js';
import { getSupabaseClient } from './lib/supabaseAdmin.js';
import { initFirebaseAdmin } from './lib/firebaseAdmin.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import logger from './lib/logger.js';
import { initSentry, Sentry } from './lib/sentry.js';

dotenv.config();
initSentry();   // Must be called before any other code that could throw
initFirebaseAdmin();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],   // Swagger UI needs inline styles
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, curl, Postman
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Body parsing — limit to 50 kb to prevent payload bombing ─────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ── HTTP request logging ──────────────────────────────────────────────────────
const morganFormat = isProd ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (msg) => logger.http(msg.trimEnd()) },
  // Skip logging for health checks to reduce noise
  skip: (req) => req.path === '/api/health',
}));

// ── Rate limiters ─────────────────────────────────────────────────────────────

// General limiter: 200 req/min per IP (covers all API routes)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta en un minuto.' } },
});

// Strict limiter for AI endpoints (Gemini calls are expensive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Límite de mensajes IA alcanzado. Espera un momento.' } },
});

app.use('/api', generalLimiter);
app.use('/api/ai/chat', aiLimiter);

// ── Supabase admin client ─────────────────────────────────────────────────────
const supabaseAdmin = getSupabaseClient();
const ENV_OK = !!supabaseAdmin;

if (!ENV_OK) {
  logger.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — API routes disabled.');
}

const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Captus Web API is running' });
});

// ── Swagger ───────────────────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Captus Web API', version: '1.0.0', description: 'API académica Captus' },
    servers: [{ url: process.env.API_URL || 'http://localhost:3000', description: 'Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Routes ────────────────────────────────────────────────────────────────────
if (ENV_OK && supabaseAdmin) {
  app.use('/api/ai',            verifySupabaseToken, aiRouter);
  app.use('/api/tasks',         verifySupabaseToken, TaskRoutes);
  app.use('/api/subtasks',      verifySupabaseToken, SubTaskRoutes);
  app.use('/api/statistics',    verifySupabaseToken, StatisticsRoutes);
  app.use('/api/categories',    verifySupabaseToken, CategoryRoutes);
  app.use('/api/priorities',    PriorityRoutes);
  app.use('/api/achievements',  verifySupabaseToken, UserAchievementsRoutes);
  app.use('/api/roles',         verifySupabaseToken, RolRoutes);
  app.use('/api/projects',      verifySupabaseToken, ProjectRoutes);
  app.use('/api/project-members',   verifySupabaseToken, ProjectMemberRoutes);
  app.use('/api/project-comments',  verifySupabaseToken, ProjectCommentRoutes);
  app.use('/api/comment-likes',     verifySupabaseToken, CommentLikeRoutes);
  app.use('/api/subjects',      verifySupabaseToken, SubjectRoutes);
  app.use('/api/users',         UserRoutes);
  app.use('/api/diagrams',      verifySupabaseToken, DiagramRoutes);
  app.use('/api/notes',         verifySupabaseToken, NotesRoutes);
  app.use('/api/events',        verifySupabaseToken, EventsRoutes);
  app.use('/api/courses',       CourseRoutes);
  app.use('/api/enrollments',   EnrollmentRoutes);
  app.use('/api/assignments',   AssignmentRoutes);
  app.use('/api/submissions',   SubmissionRoutes);
  app.use('/api/groups',        AcademicGroupRoutes);
  app.use('/api/notifications', NotificationRoutes);

  app.post('/api/telegram/webhook', telegramController.handleWebhook);
  app.use('/api/telegram',      verifySupabaseToken, TelegramRoutes);
  app.use('/api/admin',         AdminRoutes);
  app.use('/api/superadmin',    SuperAdminRoutes);
}

// ── Root info ─────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'Captus Web API', version: '1.0.0', docs: '/api-docs' }));
app.get('/api', (_req, res) => res.json({ status: 'Running', docs: '/api-docs', health: '/api/health' }));

// ── 404 + Global error handler (must be last) ─────────────────────────────────
app.use(notFoundHandler);
// Sentry must capture errors before our custom handler formats the response
app.use(Sentry.expressErrorHandler());
app.use(errorHandler);

export default app;
