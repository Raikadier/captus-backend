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
import { getSupabaseClient } from './lib/supabaseAdmin.js';
import telegramProvider from './services/notifications/providers/TelegramProvider.js';

// Ensure dotenv is configured before anything else if possible,
// though imports are hoisted, side-effect imports like 'dotenv/config' are better.
// But here we call it explicitly.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Supabase admin client (for token verification and server-side operations)
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

// Swagger configuration (minimal)
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
        url: `http://localhost:${PORT}`,
        description: 'Development server',
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
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/docs/swaggerRoutes.js'
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// AI routes (prefijo /api/ai para frontend)
if (ENV_OK && supabaseAdmin) {
  app.use('/api/ai', verifySupabaseToken, aiRouter);
}

// Extended API routes
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
  app.use('/api/courses', CourseRoutes); // Middleware internal to routes
  app.use('/api/enrollments', EnrollmentRoutes);
  app.use('/api/assignments', AssignmentRoutes);
  app.use('/api/submissions', SubmissionRoutes);
  app.use('/api/groups', AcademicGroupRoutes);

  app.use('/api/notifications', NotificationRoutes);

  // Telegram Routes
  // Webhook must be public
  app.post('/api/telegram/webhook', telegramController.handleWebhook);
  // Other routes protected
  app.use('/api/telegram', verifySupabaseToken, TelegramRoutes);
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Captus Web API',
    version: '1.0.0',
    status: 'Running',
    docs: '/api-docs',
    health: '/api/health'
  });
});

// API base helper
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

app.listen(PORT, async () => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const apiBase = `http://localhost:${PORT}/api`;
  console.log('===================================');
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: ${apiBase}/health`);
  console.log(`Swagger UI:   http://localhost:${PORT}/api-docs`);
  console.log(`API base:     ${apiBase}`);
  console.log(`Frontend:     ${frontendUrl}`);

  // Automate Telegram Webhook if NGROK_URL is present
  const publicUrl = process.env.NGROK_URL || process.env.PUBLIC_URL;
  if (publicUrl) {
    console.log('Configuring Telegram Webhook...');
    await telegramProvider.setWebhook(publicUrl);
  } else {
    console.log('Skipping Telegram Webhook (No NGROK_URL/PUBLIC_URL provided)');
  }
  console.log('===================================');
});
