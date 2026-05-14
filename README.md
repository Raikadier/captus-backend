<div align="center">

# Captus Backend

**REST API for the Captus intelligent academic management platform**

[![CI](https://github.com/Raikadier/captus-backend/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Raikadier/captus-backend/actions/workflows/backend-ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live API](https://captus-backend.vercel.app/api) · [API Docs (Swagger)](https://captus-backend.vercel.app/api-docs) · [Mobile App](https://github.com/Raikadier/captus_mobile)

</div>

---

## Overview

Captus Backend is the Node.js/Express REST API powering the Captus mobile application — an intelligent academic management platform for Latin American universities. It handles authentication, task management, course operations, multi-channel notifications, and an AI assistant built on Google Gemini.

The API serves four user roles with distinct permissions: **students**, **teachers**, **institution admins**, and **platform superadmins**.

---

## Features

| Domain | Capabilities |
|---|---|
| 🤖 **AI Assistant** | Intent-based routing, tool execution, conversation persistence, RAG context |
| 📋 **Task Management** | Tasks, subtasks, priorities, categories, streak tracking |
| 🎓 **Academic Content** | Courses, assignments, submissions, grading scales, academic periods |
| 👥 **Collaboration** | Projects, study groups, member management, comments |
| 🔔 **Notifications** | FCM push (Firebase), Telegram bot, email (Nodemailer) |
| 🏆 **Achievements** | Badge system, streak tracking, progress analytics |
| 🏛️ **Institution Admin** | Users, courses, grading, periods, broadcast notifications |
| 🔐 **Superadmin** | Multi-institution oversight, audit log, global user management |
| 📊 **Statistics** | Dashboard widgets, productivity charts, streak data |
| 🔒 **Security** | JWT auth, rate limiting, Zod validation, Helmet CSP, Sentry |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20+ (ES Modules) |
| **Framework** | Express 5 |
| **Database** | Supabase (PostgreSQL 17) |
| **Authentication** | Supabase Auth — JWT |
| **AI / LLM** | Google Gemini (Flash + Pro) |
| **Push Notifications** | Firebase Admin SDK (FCM) |
| **Messaging** | Telegram Bot API, Nodemailer |
| **Validation** | Zod |
| **Security** | Helmet, CORS, express-rate-limit |
| **Logging** | Winston + Morgan |
| **Error Tracking** | Sentry |
| **API Docs** | Swagger (OpenAPI 3.0) |
| **Testing** | Jest (ESM) |
| **Deployment** | Vercel (serverless) |
| **CI/CD** | GitHub Actions |

---

## Architecture

```
captus-backend/
├── api/
│   └── index.js                  # Vercel serverless entry point
├── src/
│   ├── app.js                    # Express app (middleware chain)
│   ├── server.js                 # Local dev server
│   ├── ai/                       # AI orchestration layer
│   │   ├── routerAgent.js        # Intent classification
│   │   ├── orchestrator.js       # Tool execution & response
│   │   ├── toolRegistry.js       # 20+ tool definitions
│   │   ├── context.js            # Dynamic RAG context
│   │   ├── model.js              # Gemini API wrapper
│   │   ├── prompts.js            # System prompts
│   │   └── utils/json.js         # Safe JSON parsing
│   ├── routes/                   # 26 route files
│   ├── controllers/              # 25 request handlers
│   ├── services/                 # 29 business logic services
│   ├── repositories/             # 33 data access classes
│   ├── middlewares/              # Auth, validation, error handling
│   ├── lib/                      # Supabase, Firebase, Logger, Sentry
│   └── shared/                   # Zod schemas, OperationResult
├── database/
│   ├── schema.sql                # Full Supabase schema
│   └── migrations/               # Incremental SQL migrations
├── docs/                         # Architecture diagrams & UML
└── scripts/                      # Cron jobs & data seeders
```

### Request Lifecycle

```
Request
  → Helmet (security headers)
  → CORS
  → Compression (gzip)
  → Rate Limiter (200 req/min · 30 req/min for AI)
  → Body Parser (JSON, max 50 KB)
  → Morgan (HTTP logging)
  → verifySupabaseToken (JWT validation)
  → injectUserRole (DB role lookup)
  → Route handler
  → Controller → Service → Repository → Supabase
  → Response
  → errorHandler (on exception) + Sentry (on 5xx)
```

### AI Pipeline

```
POST /api/ai/chat
  → validate(AiChatSchema)              # Zod: message ≤ 2000 chars
  → routerAgent(message, userId)
      → fetchUserProfile()
      → classifyIntent()                # Gemini Flash (fast, cheap)
  → orchestrator(intent, context)
      → fetchContextForIntent()         # RAG: tasks, notes, courses...
      → executeTools()                  # CRUD via toolRegistry
      → generateResponse()              # Gemini Pro / Flash
  → persistConversation(supabase)
  → { result, steps, conversationId, actionPerformed }
```

**Supported intents:** `task` · `subtask` · `note` · `event` · `course` · `assignment` · `submission` · `enrollment` · `achievement` · `general`

---

## Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **npm** 9+
- A [Supabase](https://supabase.com) project (PostgreSQL)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)
- A [Firebase](https://console.firebase.google.com) project with Admin SDK (for FCM)

### 1. Clone & install

```bash
git clone https://github.com/Raikadier/captus-backend.git
cd captus-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (not the anon key) |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Firebase Admin SDK service account JSON (stringified) |
| `PORT` | ➖ | Server port (default: `3000`) |
| `NODE_ENV` | ➖ | `development` / `production` / `test` |
| `FRONTEND_URL` | ➖ | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `EXTRA_ORIGINS` | ➖ | Additional CORS origins, comma-separated |
| `SENTRY_DSN` | ➖ | Sentry DSN for error tracking |
| `NGROK_URL` | ➖ | Telegram webhook base URL (dev tunneling) |

### 3. Set up the database

Apply the base schema to your Supabase project via the SQL Editor or Supabase CLI:

```bash
# Supabase CLI
supabase db push

# Or paste database/schema.sql directly in the Supabase SQL Editor
```

### 4. Run

```bash
# Development (auto-reload with nodemon)
npm run dev

# Production
npm start
```

Server: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api-docs`

---

## API Reference

> **Base URL:** `https://captus-backend.vercel.app/api`  
> **Auth header:** `Authorization: Bearer <supabase_jwt>`  
> **Full interactive docs:** [`/api-docs`](https://captus-backend.vercel.app/api-docs)

<details>
<summary><strong>🤖 AI Assistant — <code>/api/ai</code></strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/conversations` | List user's recent conversations |
| `GET` | `/conversations/:id/messages` | Get messages in a conversation |
| `POST` | `/chat` | Send message — routes intent, executes tools, returns AI reply |

</details>

<details>
<summary><strong>📋 Tasks & Subtasks — <code>/api/tasks</code> · <code>/api/subtasks</code></strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tasks` | Get all tasks for authenticated user |
| `GET` | `/tasks/pending` | Get pending tasks |
| `POST` | `/tasks` | Create task |
| `PUT` | `/tasks/:id` | Update task |
| `DELETE` | `/tasks/:id` | Delete task |
| `PUT` | `/tasks/:id/complete` | Toggle completion |
| `GET` | `/subtasks/task/:taskId` | Get subtasks for a task |
| `POST` | `/subtasks` | Create subtask |
| `PUT` | `/subtasks/:id/complete` | Complete subtask |

</details>

<details>
<summary><strong>🎓 Courses & Assignments — <code>/api/courses</code> · <code>/api/assignments</code></strong></summary>

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/courses/student` | Student | Enrolled courses |
| `GET` | `/courses/teacher` | Teacher | Managed courses |
| `POST` | `/courses` | Teacher | Create course |
| `GET` | `/courses/:id` | Any | Course details |
| `GET` | `/courses/:id/grades/download` | Teacher | Export grades file |
| `POST` | `/enrollments/join-by-code` | Student | Join via invite code |
| `POST` | `/assignments` | Teacher | Create assignment |
| `GET` | `/assignments/course/:id` | Any | List assignments |
| `POST` | `/submissions` | Student | Submit assignment |

</details>

<details>
<summary><strong>📅 Notes, Events & Statistics</strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notes` | Get all notes |
| `POST` | `/notes` | Create note |
| `PUT` | `/notes/:id/toggle-pin` | Pin/unpin note |
| `GET` | `/events` | Get calendar events |
| `POST` | `/events` | Create event |
| `GET` | `/statistics/dashboard` | Dashboard stats |
| `GET` | `/statistics/tasks` | Productivity chart (weekly) |
| `GET` | `/statistics/streak-stats` | Streak data |
| `POST` | `/statistics/check-achievements` | Trigger achievement check |

</details>

<details>
<summary><strong>🔔 Notifications — <code>/api/notifications</code></strong></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | Get notifications (paginated) |
| `PUT` | `/notifications/:id/read` | Mark as read |
| `PUT` | `/notifications/preferences` | Update notification preferences |
| `POST` | `/notifications/device-token` | Register FCM token |
| `DELETE` | `/notifications/device-token` | Unregister FCM token |

</details>

<details>
<summary><strong>🏛️ Admin & Superadmin — <code>/api/admin</code> · <code>/api/superadmin</code></strong></summary>

**Admin** (requires `admin` role): Institution management · user invitations · course operations · grading scales · academic periods · broadcast notifications.

**Superadmin** (requires `superadmin` role): Platform-wide statistics · multi-institution management · global user role changes · audit log.

</details>

---

## Rate Limiting

| Scope | Limit |
|---|---|
| All `/api` routes | 200 requests / minute / IP |
| `POST /api/ai/chat` | 30 requests / minute / IP |
| `GET /api/health` | No limit |

---

## Roles & Permissions

| Role | Access Level |
|---|---|
| `student` | Own tasks, enrolled courses, AI assistant, submissions |
| `teacher` | All student access + course/assignment management, grading |
| `admin` | All teacher access + institution management, user invitations |
| `superadmin` | Full platform access + audit log, multi-institution control |

---

## Testing

```bash
# Run all tests
npm test

# With coverage report
npm test -- --coverage --forceExit

# Single file
npm test -- src/ai/__tests__/toolRegistry.test.js

# Lint
npm run lint
```

| Suite | Tests | Covers |
|---|---|---|
| AI Module (`src/ai/__tests__/`) | 529 | Intent routing, tool execution, JSON parsing, context fetching |
| Services | ~120 | Task, Note, Course, User, Achievement services |
| Middlewares | ~40 | Auth, validation, error handling |
| System | ~30 | End-to-end API flows |

---

## Deployment

Deployed as a **Vercel serverless function** via `api/index.js`.

```bash
# Preview deployment
vercel

# Production
vercel --prod
```

**Required Vercel environment variables:**

```
SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · GEMINI_API_KEY
FIREBASE_SERVICE_ACCOUNT_JSON · NODE_ENV=production
SENTRY_DSN · FRONTEND_URL
```

**CI/CD:** Every push to `main` runs lint → test → startup verification via GitHub Actions.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Ensure CI passes: `npm run lint && npm test`
5. Open a Pull Request against `main`

---

## License

[MIT](LICENSE) © Captus Project

---

<div align="center">

Built with ❤️ for Latin American higher education · [captusproject123@gmail.com](mailto:captusproject123@gmail.com)

</div>
