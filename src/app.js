import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { getSupabaseClient } from './lib/supabaseAdmin.js';
import { initFirebaseAdmin } from './lib/firebaseAdmin.js';

dotenv.config();
initFirebaseAdmin(); // FCM push — no-ops gracefully if env vars are absent

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Supabase admin client
const supabaseAdmin = getSupabaseClient();
const ENV_OK = !!supabaseAdmin;

if (!ENV_OK) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}

const verifySupabaseToken = buildSupabaseAuthMiddleware(supabaseAdmin);

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Captus Web API is running' });
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Captus Web API',
      version: '1.0.0',
      description: 'Minimal API for the Captus application (streaks only)',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/docs/swaggerRoutes.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// AI routes
if (ENV_OK && supabaseAdmin) {
  app.use('/api/ai', verifySupabaseToken, aiRouter);
}

// API routes
if (ENV_OK && supabaseAdmin) {
  app.use('/api/tasks', verifySupabaseToken, TaskRoutes);
  app.use('/api/subtasks', verifySupabaseToken, SubTaskRoutes);
  app.use('/api/statistics', verifySupabaseToken, StatisticsRoutes);
  app.use('/api/categories', verifySupabaseToken, CategoryRoutes);
  app.use('/api/priorities', PriorityRoutes);
  app.use('/api/achievements', verifySupabaseToken, UserAchievementsRoutes);
  app.use('/api/roles', verifySupabaseToken, RolRoutes);
  app.use('/api/projects', verifySupabaseToken, ProjectRoutes);
  app.use('/api/project-members', verifySupabaseToken, ProjectMemberRoutes);
  app.use('/api/project-comments', verifySupabaseToken, ProjectCommentRoutes);
  app.use('/api/comment-likes', verifySupabaseToken, CommentLikeRoutes);
  app.use('/api/subjects', verifySupabaseToken, SubjectRoutes);
  app.use('/api/users', UserRoutes);
  app.use('/api/diagrams', verifySupabaseToken, DiagramRoutes);
  app.use('/api/notes', verifySupabaseToken, NotesRoutes);
  app.use('/api/events', verifySupabaseToken, EventsRoutes);
  app.use('/api/courses', CourseRoutes);
  app.use('/api/enrollments', EnrollmentRoutes);
  app.use('/api/assignments', AssignmentRoutes);
  app.use('/api/submissions', SubmissionRoutes);
  app.use('/api/groups', AcademicGroupRoutes);
  app.use('/api/notifications', NotificationRoutes);

  // Telegram webhook (public) + protected routes
  app.post('/api/telegram/webhook', telegramController.handleWebhook);
  app.use('/api/telegram', verifySupabaseToken, TelegramRoutes);

  // Admin routes (institution management)
  app.use('/api/admin', AdminRoutes);
}

// Root routes
app.get('/', (req, res) => {
  res.json({
    message: 'Captus Web API',
    version: '1.0.0',
    status: 'Running',
    docs: '/api-docs',
    health: '/api/health'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Captus API',
    status: 'Running',
    health: '/api/health',
    docs: '/api-docs',
    endpoints: [
      '/api/health',
      '/api/tasks',
      '/api/subtasks',
      '/api/statistics',
      '/api/categories',
      '/api/priorities',
      '/api/achievements',
      '/api/roles',
      '/api/projects',
      '/api/project-members',
      '/api/project-comments',
      '/api/comment-likes',
      '/api/subjects',
      '/api/users',
      '/api/notes',
      '/api/events'
    ]
  });
});

export default app;
