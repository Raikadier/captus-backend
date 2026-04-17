# Arquitectura de Captus

Este documento describe la arquitectura final y mínima para el proyecto Captus, orientada a estudiantes de 6to semestre. Mantiene el enfoque simple, sin sobrecargar con servicios innecesarios.

Objetivos
- Un solo proyecto en [Captus/](Captus)
- Frontend con React + Vite, autenticación y CRUD de tareas con supabase-js
- Backend Express mínimo solo para rachas (streaks)
- Base de datos y autenticación gestionadas por Supabase (Auth + Postgres + RLS)

Estructura de carpetas objetivo

```
Captus/
├─ backend/
│  └─ src/
│     ├─ routes/        # solo streakRoutes
│     ├─ services/      # streakService
│     └─ models/        # streak (opcional)
├─ public/
├─ src/
│  ├─ context/          # [AuthProvider](Captus/src/context/AuthContext.jsx:14)
│  ├─ shared/
│  │  └─ api/
│  │     ├─ client.js   # axios → backend minimal
│  │     └─ supabase.js # supabase-js → auth y tareas
│  ├─ features/         # por funcionalidades (tasks, dashboard, etc.)
│  └─ App.jsx           # rutas y ProtectedRoute
├─ docs/
│  └─ arquitectura.md
├─ server.js            # backend Express mínimo
├─ supabase-schema.sql  # esquema SQL
├─ .env                 # backend
└─ .env.local           # frontend
```

Frontend

Stack
- React + Vite
- supabase-js para autenticación y acceso a Postgres
- axios solo para llamar al backend mínimo de rachas

Puntos clave
- Contexto de autenticación en [AuthProvider](Captus/src/context/AuthContext.jsx:14)
- Hook de tareas [useTasks()](Captus/src/features/tasks/hooks/useTasks.js:5)
- Rutas protegidas en [Captus/src/App.jsx](Captus/src/App.jsx)
- Cliente HTTP [client.js](Captus/src/shared/api/client.js) y cliente Supabase en [supabase.js](Captus/src/shared/api/supabase.js)

Flujo básico
1) Registro/inicio de sesión con supabase-js
2) Guardar sesión en memoria del SDK; no generar JWT propio
3) CRUD de tareas directo a Supabase (tabla tasks) con RLS
4) Racha: llamada al backend Express /api/streaks

Backend mínimo (Express)

Ubicación: [Captus/server.js](Captus/server.js)

Responsabilidades
- Salud del API: GET /api/health
- Rachas: /api/streaks [GET, PUT]
- Validación de token de Supabase con middleware verifySupabaseToken

Qué depurar del código actual
- Eliminar endpoints de auth y emisión de JWT propios: [authenticateToken()](Captus/server.js:43) y rutas /api/auth
- Eliminar rutas de tareas /api/tasks y su lógica asociada
- Mantener solo streaks en [Captus/backend/src/services/streakService.js](Captus/backend/src/services/streakService.js)

Middleware de autenticación
- Reemplazar [authenticateToken()](Captus/server.js:43) por verifySupabaseToken
- verifySupabaseToken debe:
  - Leer Authorization Bearer <access_token> (token de Supabase)
  - Usar SUPABASE_SERVICE_ROLE_KEY para llamar supabase.auth.getUser
  - Poner req.user = { id, email } y continuar

Endpoints
- GET /api/health → { status: OK }
- GET /api/streaks → { current_streak, last_completed_date, daily_goal }
- PUT /api/streaks body: { hasCompletedToday?: boolean } → mismo objeto actualizado

Base de datos (Supabase)

Tablas mínimas
- tasks: id serial, title, description, due_date timestamptz, priority_id, category_id, completed boolean, user_id uuid, parent_task_id, created_at, updated_at
- streaks: user_id uuid unique, current_streak int, last_completed_date date, daily_goal int, created_at, updated_at

Referencias recomendadas
- user_id referencia a auth.users(id) para simplificar RLS

Políticas RLS (ejemplo)

```
-- Habilitar RLS
alter table tasks enable row level security;
alter table streaks enable row level security;

-- Políticas tasks
create policy tasks_select on tasks
  for select using (user_id = auth.uid());

create policy tasks_insert on tasks
  for insert with check (user_id = auth.uid());

create policy tasks_update on tasks
  for update using (user_id = auth.uid());

create policy tasks_delete on tasks
  for delete using (user_id = auth.uid());

-- Políticas streaks
create policy streaks_select on streaks
  for select using (user_id = auth.uid());
```

Variables de entorno

Frontend [Captus/.env.local](Captus/.env.local)
- VITE_SUPABASE_URL=
- VITE_SUPABASE_ANON_KEY=
- VITE_API_BASE_URL=http://localhost:4000

Backend [Captus/.env](Captus/.env)
- PORT=4000
- SUPABASE_URL=
- SUPABASE_SERVICE_ROLE_KEY=
- FRONTEND_URL=http://localhost:5173

Contratos del frontend
- Auth: supabase.auth.signUp, supabase.auth.signInWithPassword, supabase.auth.signOut, supabase.auth.getSession
- Tareas: supabase.from('tasks').select/insert/update/delete con user_id = session.user.id
- Racha: axios GET/PUT a ${import.meta.env.VITE_API_BASE_URL}/api/streaks con bearer del access_token de Supabase si se requiere

Diagrama de componentes

```mermaid
graph TD
  A[React Vite Frontend] -->|supabase-js| B[Supabase Auth y Postgres]
  A -->|axios VITE_API_BASE_URL| C[Express Backend Minimo]
  C -->|Service Role Key| B
  A --> D[AuthContext y Hooks]
  D --> E[Tasks CRUD via RLS]
  A --> F[Streak Widget via api streaks]
```

Diagrama de secuencia

```mermaid
sequenceDiagram
  participant UI as Frontend
  participant SB as Supabase
  participant API as Express
  UI->>SB: signInWithPassword
  SB-->>UI: session y user
  UI->>SB: from tasks select insert update delete
  UI->>API: GET /api/streaks
  API->>SB: validar token y consultar streaks
  SB-->>API: datos de racha
  API-->>UI: racha actual
```

Desarrollo local
- Terminal 1: npm run dev (frontend)
- Terminal 2: npm run server o node [Captus/server.js](Captus/server.js)
- Configurar .env y .env.local antes de ejecutar

Guía de migración desde el estado actual
1) Eliminar carpetas duplicadas [backend/](backend) y [frontend/](frontend) para evitar confusión
2) En [Captus/server.js](Captus/server.js): quitar rutas /api/auth y /api/tasks, dejar /api/health y /api/streaks, reemplazar [authenticateToken()](Captus/server.js:43) por verifySupabaseToken
3) Crear [Captus/src/shared/api/supabase.js](Captus/src/shared/api/supabase.js) y mover la lógica de login/registro/logout allí
4) Actualizar [AuthProvider](Captus/src/context/AuthContext.jsx:14) para usar supabase-js en vez de axios a /api/auth
5) Migrar [useTasks()](Captus/src/features/tasks/hooks/useTasks.js:5) a supabase-js directo y usar axios solo para /api/streaks
6) Ajustar [client.js](Captus/src/shared/api/client.js) para leer import.meta.env.VITE_API_BASE_URL con fallback a /api
7) Revisar [Captus/supabase-schema.sql](Captus/supabase-schema.sql) y aplicar RLS

Criterios de terminado del MVP
- Registro e ingreso funcionando con supabase-js
- CRUD de tareas por usuario con RLS
- Widget de racha mostrando current_streak y actualizándose cuando se completa una tarea
- Scripts npm levantan frontend y backend en dos terminales