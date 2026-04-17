# CAPTUS Backend - Diagrama de Clases UML

## Resumen Ejecutivo

Este documento presenta el análisis detallado de la arquitectura del proyecto backend de **Captus**, una aplicación de gestión de tareas y proyectos colaborativos. El proyecto sigue el patrón arquitectónico **Repository → Service → Controller** con inyección de dependencias.

---

## 1. Modelos (Entidades Principales)

### 1.1 User (Usuario)

```javascript
// backend/src/models/UserModels.js
class User {
  -id: string              // UUID de Supabase
  -email: string           // Correo electrónico único
  -name: string            // Nombre completo
  -role: string            // Rol ('student' por defecto)
  -carrer: string         // Carrera/Especialidad
  -bio: string            // Biografía
  -avatar_url: string     // URL del avatar
  -created_at: Date       // Fecha de creación
  -updated_at: Date       // Fecha de actualización
  
  +fromDatabase(row): User
  +fromSupabaseAuth(authUser): User
  +toDatabase(): Object
  +validate(): { isValid: boolean, errors: string[] }
}
```

### 1.2 Project (Proyecto)

```javascript
// backend/src/models/ProjectModels.js
class Project {
  -id_Project: number
  -name: string            // Nombre único del proyecto
  -description: string     // Descripción
  -createdAt: Date         // Fecha de creación
  -id_Creator: string      // FK → User.id
}
```

### 1.3 ProjectMember (Miembro de Proyecto)

```javascript
// backend/src/models/ProjectMembersModels.js
class ProjectMember {
  -id_ProjectMember: number
  -id_User: string         // FK → User.id
  -id_Project: number      // FK → Project.id_Project
  -id_Rol: number          // FK → Rol.id_Rol
}
```

### 1.4 Task (Tarea)

```javascript
// backend/src/models/TaskModels.js
class Task {
  -id_Task: number
  -title: string           // Título de la tarea
  -id_Category: number     // FK → Category.id_Category
  -description: string     // Descripción
  -creationDate: Date      // Fecha de creación
  -endDate: Date           // Fecha límite
  -id_Priority: number     // FK → Priority
  -state: boolean          // Completada/Sin completar
  -id_User: string         // FK → User.id (propietario)
  -project_id: number      // FK → Project.id_Project (opcional)
}
```

### 1.5 SubTask (Subtarea)

```javascript
// backend/src/models/SubTaskModels.js
class SubTask {
  -id_SubTask: number
  -title: string
  -id_Category: number     // FK → Category
  -description: string
  -creationDate: Date
  -endDate: Date
  -id_Priority: number
  -state: boolean
  -id_Task: number        // FK → Task.id_Task (parent)
}
```

### 1.6 Category (Categoría)

```javascript
// backend/src/models/CategoryModels.js
class Category {
  -id_Category: number
  -name: string           // Nombre de la categoría
  -id_User: string        // FK → User.id (propietario)
}
```

### 1.7 Statistics (Estadísticas)

```javascript
// backend/src/models/StatisticsModels.js
class Statistics {
  -id_Statistics: number
  -id_User: string        // FK → User.id
  -startDate: Date
  -endDate: Date
  -lastRachaDate: Date   // Última fecha de racha
  -racha: number         // Racha actual de días
  -totalTasks: number    // Total de tareas creadas
  -completedTasks: number // Tareas completadas
  -dailyGoal: number     // Meta diaria (default: 5)
  -bestStreak: number    // Mejor racha histórica
  -favoriteCategory: number // FK → Category
}
```

### 1.8 UserAchievements (Logros)

```javascript
// backend/src/models/UserAchievementsModels.js
class UserAchievements {
  -id: number             // PK
  -id_User: string        // FK → User.id
  -achievementId: string // Identificador del logro
  -unlockedAt: Date       // Fecha de desbloqueo
  -progress: number       // Progreso actual (0-100)
  -isCompleted: boolean   // Completado
}
```

---

## 2. Repositorios

### 2.1 BaseRepository (Clase Base)

```javascript
// backend/src/repositories/BaseRepository.js
class BaseRepository {
  -tableName: string
  -primaryKey: string
  -mapToDb: function
  -mapFromDb: function
  -select: string
  
  +save(entity): Promise<any>
  +update(id, entity): Promise<any>
  +delete(id): Promise<boolean>
  +getById(id): Promise<any>
  +getAll(match?: Object): Promise<any[]>
}
```

### 2.2 Repositorios Derivados

| Repositorio | Tabla | Métodos Específicos |
|-------------|-------|---------------------|
| `UserRepository` | users | save, getByUsername, isEmailRegistered, getByEmail |
| `ProjectRepository` | projects | getByCreator, getByName |
| `TaskRepository` | tasks | getAllByUserId, getOverdueByUser, getCompletedToday |
| `CategoryRepository` | categories | getAllByUser |
| `StatisticsRepository` | statistics | getByUserId |
| `SubTaskRepository` | subtasks | getAllByTaskId |
| `ProjectMemberRepository` | project_members | isMember, getUserRole |

---

## 3. Servicios

### 3.1 UserService

```javascript
class UserService {
  -userRepository: UserRepository
  -categoryService: CategoryService
  -statisticsService: StatisticsService
  -currentUser: User
  
  +getUserById(userId): Promise<User>
  +getAllUsers(): Promise<User[]>
  +syncUserFromAuth(authUser): Promise<User>
  +updateUser(userId, updateData): Promise<User>
  +deleteUser(userId): Promise<boolean>
  +deleteAccount(userId): Promise<Object>
  +isEmailRegistered(email): Promise<Object>
  +setCurrentUser(user): void
}
```

### 3.2 ProjectService

```javascript
class ProjectService {
  -currentUser: User
  
  +isProjectMember(projectId, userId?): Promise<boolean>
  +isProjectAdmin(projectId, userId?): Promise<boolean>
  +getMyProjects(): Promise<OperationResult>
  +getProjectsAsMember(): Promise<OperationResult>
  +getAllUserProjects(): Promise<OperationResult>
  +getById(id): Promise<OperationResult>
  +create(projectData): Promise<OperationResult>
  +update(id, projectData): Promise<OperationResult>
  +delete(id): Promise<OperationResult>
  +setCurrentUser(user): void
}
```

### 3.3 TaskService

```javascript
class TaskService {
  -taskRepository: TaskRepository
  -subTaskRepository: SubTaskRepository
  -priorityRepository: PriorityRepository
  -categoryRepository: CategoryRepository
  -statisticsRepository: StatisticsRepository
  -currentUser: User
  
  +save(task, userContext?): Promise<OperationResult>
  +update(task, userContext?): Promise<OperationResult>
  +delete(taskId, userId): Promise<OperationResult>
  +getTasksByUser(userContext?, filter?, limit?): Promise<Task[]>
  +getAll(userContext?): Promise<OperationResult>
  +getPendingTasks(limit?, userContext?): Promise<OperationResult>
  +getById(id, userContext?): Promise<OperationResult>
  +complete(id, userContext?): Promise<OperationResult>
  +setCurrentUser(user): void
}
```

### 3.4 Otros Servicios

| Servicio | Responsabilidad |
|----------|-----------------|
| `CategoryService` | CRUD de categorías |
| `StatisticsService` | Gestión de rachas y estadísticas |
| `AchievementValidatorService` | Validación de logros |
| `NotificationService` | Envío de notificaciones |
| `ProjectMemberService` | Gestión de miembros |

---

## 4. Controladores

### 4.1 UserController

```javascript
class UserController {
  -userService: UserService
  
  +syncUser(req, res): void
  +getProfile(req, res): void
  +updateProfile(req, res): void
  +changePassword(req, res): void
  +deleteAccount(req, res): void
  +isEmailRegistered(req, res): void
}
```

### 4.2 ProjectController

```javascript
class ProjectController {
  +injectUser: Middleware
  +getAll(req, res): void
  +getCreated(req, res): void
  +getAsMember(req, res): void
  +getById(req, res): void
  +create(req, res): void
  +update(req, res): void
  +delete(req, res): void
}
```

### 4.3 TaskController

```javascript
class TaskController {
  -taskService: TaskService
  -achievementValidator: AchievementValidatorService
  
  +injectUser: Middleware
  +getAll(req, res): void
  +getById(req, res): void
  +create(req, res): void
  +update(req, res): void
  +delete(req, res): void
  +complete(req, res): void
  +getPending(req, res): void
}
```

---

## 5. OperationResult

```javascript
// backend/src/shared/OperationResult.js
class OperationResult {
  -success: boolean
  -message: string
  -data: any
}
```

---

## 6. Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA CAPTUS                             │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │ Controllers  │────▶│   Services   │────▶│ Repositories│
    │              │     │              │     │              │
    │ - User       │     │ - User       │     │ - User       │
    │ - Project    │     │ - Project    │     │ - Project    │
    │ - Task       │     │ - Task       │     │ - Task       │
    │ - Category   │     │ - Category   │     │ - Category   │
    │ - etc.       │     │ - Statistics │     │ - Statistics │
    └──────────────┘     │ - Achievement│     └──────────────┘
                        │ - Notification│              │
                        └──────────────┘              │
                                │                    │
                                ▼                    ▼
                        ┌──────────────┐     ┌──────────────┐
                        │   Services   │     │ Repositories │
                        │   Helpers   │     │   (Base)     │
                        │              │     │              │
                        │ - Operation │     │ - save()     │
                        │   Result    │     │ - update()   │
                        └──────────────┘     │ - delete()   │
                                              │ - getById() │
                                              │ - getAll()  │
                                              └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │   Supabase   │
                                              │   (PostgreSQL)│
                                              └──────────────┘
```

---

## 7. Modelo Entidad-Relación

```
┌────────────┐       ┌────────────┐       ┌────────────┐
│    User    │       │  Project   │       │   Task     │
├────────────┤       ├────────────┤       ├────────────┤
│ id (PK)    │──┐    │ id (PK)    │    ┌──│ id (PK)    │
│ email      │  │    │ name       │    │  │ title      │
│ name       │  │    │ description    │  │ category_id│
│ role       │  │    │ creator_id │────┘  │ priority_id │
│ carrer     │  │    └────────────┘       │ user_id (FK)│
│ bio        │  │                         │ project_id  │
│ avatar_url │  │                         │ state       │
└────────────┘  │                         └──────────────┘
                │                                │
                │                                │
                │       ┌────────────┐           │
                └──────▶│ProjectMember│◀────────┘
                        ├────────────┤
                        │ id (PK)    │
          ┌─────────────▶│ project_id │───────────┐
          │              │ user_id (FK)           │
          │              │ rol_id                 │
          │              └────────────┘           │
          │                                         │
          │              ┌────────────┐           │
          └──────────────│  Category  │◀──────────┘
                         ├────────────┤
                         │ id (PK)    │
                         │ name       │
                         │ user_id (FK)│
                         └────────────┘
                                │
                                ▼
                        ┌────────────┐
                        │SubTask     │
                        ├────────────┤
                        │ id (PK)    │
                        │ title      │
                        │ task_id (FK)│
                        │ state      │
                        └────────────┘


┌────────────┐       ┌────────────┐       ┌────────────┐
│Statistics  │       │    Rol     │       │UserAchievs │
├────────────┤       ├────────────┤       ├────────────┤
│ id (PK)    │       │ id (PK)    │       │ id (PK)    │
│ user_id (FK)      │ name       │       │ user_id(FK)│
│ racha      │       └────────────┘       │ achievement│
│ totalTasks │                            │ progress   │
│ completed  │                            │ isCompleted│
│ dailyGoal  │                            └────────────┘
│ bestStreak │
└────────────┘
```

---

## 8. Flujo de Datos Típico

### Ejemplo: Crear una tarea

```
1. Frontend envía POST /api/tasks con { title, due_date, ... }

2. Middleware verifySupabaseToken autentica y añade req.user

3. TaskController.create(req, res)
   └─> Llama a taskService.save(req.body, req.user)

4. TaskService.save()
   ├─> Valida tarea (validateTask)
   ├─> Llama a taskRepository.save(task)
   │   └─> BaseRepository.save() → Supabase.insert()
   ├─> Llama a notificationService.notify()
   └─> Retorna OperationResult

5. TaskController responde con JSON
```

---

## 9. Dependencias entre Servicios

```
UserService
    ├──▶ CategoryService (inicializa categoría "General")
    └──▶ StatisticsService (inicializa estadísticas)

TaskService
    ├──▶ CategoryService
    ├──▶ PriorityRepository
    ├──▶ SubTaskRepository
    └──▶ StatisticsService (actualiza al completar)

ProjectService
    └──▶ ProjectMemberRepository

NotificationService
    ├──▶ EmailProvider
    ├──▶ TelegramProvider
    └──▶ WhatsAppProvider
```

---

## 10. Resumen de Tablas en Base de Datos

| Tabla | Descripción |
|-------|-------------|
| users | Usuarios del sistema |
| projects | Proyectos colaborativos |
| project_members | Relación usuario-proyecto-rol |
| project_comments | Comentarios en proyectos |
| tasks | Tareas de usuarios |
| subtasks | Subtareas |
| categories | Categorías de tareas |
| priorities | Prioridades (alta, media, baja) |
| statistics | Estadísticas de usuario |
| user_achievements | Logros desbloqueados |
| notifications | Registro de notificaciones |
| notification_preferences | Preferencias de notificaciones |

---

*Documento generado automáticamente para el proyecto Captus Backend*
