import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import streakRoutes, { setStreakService } from './src/routes/streakRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Supabase admin client (for token verification and server-side operations)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}
const ENV_OK = !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (ENV_OK) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  // Initialize services with supabase admin
  setStreakService(supabaseAdmin);
}

// Middleware: verify Supabase access token from Authorization: Bearer <token>
const verifySupabaseToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: data.user.id, email: data.user.email };
    req.accessToken = token;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

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
  apis: ['./src/routes/streakRoutes.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes (minimal)
app.use(
  '/api/streaks',
  (req, res, next) => {
    if (!ENV_OK) {
      return res.status(503).json({ error: 'Server misconfiguration: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY' });
    }
    return next();
  },
  verifySupabaseToken,
  streakRoutes
);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});