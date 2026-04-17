# Diagrama de Clases UML - Proyecto Captus (Mejorado para Pruebas Unitarias)

```mermaid
classDiagram
    %% ============================================
    %% SHARED COMPONENTS
    %% ============================================
    
    class OperationResult {
        +boolean success
        +string message
        +any data
        +OperationResult(success, message, data)
    }

    %% ============================================
    %% MODELS (Entity Classes)
    %% ============================================
    
    class User {
        +string id
        +string email
        +string name
        +string password
        +string avatar_url
        +date created_at
    }
    
    class Project {
        +string id
        +string name
        +string description
        +string owner_id
        +date created_at
    }
    
    class ProjectMember {
        +string id
        +string project_id
        +string user_id
        +string rol_id
        +date joined_at
    }
    
    class Task {
        +string id
        +string project_id
        +string title
        +string description
        +string status
        +string priority_id
        +string category_id
        +string assigned_to
        +date due_date
        +date created_at
    }
    
    class SubTask {
        +string id
        +string task_id
        +string title
        +boolean completed
    }
    
    class Category {
        +string id
        +string name
        +string color
        +string project_id
    }
    
    class Statistics {
        +string id
        +string user_id
        +number total_projects
        +number total_tasks
        +number completed_tasks
        +number pending_tasks
    }
    
    class UserAchievements {
        +string id
        +string user_id
        +string achievement_id
        +date earned_at
    }
    
    class Events {
        +string id
        +string title
        +string description
        +date start_date
        +date end_date
        +string user_id
    }
    
    class Notes {
        +string id
        +string user_id
        +string title
        +string content
        +date created_at
    }
    
    class CommentLike {
        +string id
        +string comment_id
        +string user_id
    }
    
    class ProjectComment {
        +string id
        +string project_id
        +string user_id
        +string content
        +string parent_id
        +date created_at
    }
    
    class Priority {
        +string id
        +string name
        +string color
    }
    
    class Rol {
        +string id
        +string name
    }
    
    class TelegramLinkCode {
        +string id
        +string user_id
        +string code
        +date expires_at
        +boolean used
    }
    
    class ChatMessage {
        +string id
        +string conversation_id
        +string sender_id
        +string content
        +date created_at
    }
    
    class AcademicGroup {
        +string id
        +string name
        +string description
        +string owner_id
    }
    
    class Course {
        +string id
        +string name
        +string code
        +string academic_group_id
    }
    
    class Enrollment {
        +string id
        +string user_id
        +string course_id
        +date enrolled_at
    }
    
    class Assignment {
        +string id
        +string course_id
        +string title
        +date due_date
    }
    
    class Subject {
        +string id
        +string name
        +string code
    }
    
    class Submission {
        +string id
        +string assignment_id
        +string student_id
        +string content
        +date submitted_at
    }
    
    class Diagram {
        +string id
        +string name
        +string content
        +string project_id
        +date created_at
    }

    %% ============================================
    %% REPOSITORIES (Data Access Layer)
    %% ============================================
    
    class BaseRepository {
        +string tableName
        +string primaryKey
        +save(entity)
        +update(id, entity)
        +delete(id)
        +getById(id)
        +getAll(match?)
    }
    
    class UserRepository {
        +findByEmail(email)
        +findBySupabaseId(supabaseId)
        +getByUsername(username)
        +isEmailRegistered(email)
    }
    
    class ProjectRepository {
        +findByOwner(ownerId)
        +findByMember(userId)
        +getByCreator(creatorId)
        +getByName(name)
        +isMember(projectId, userId)
    }
    
    class TaskRepository {
        +findByProject(projectId)
        +findByAssignee(userId)
        +findByStatus(status)
        +getAllByUserId(userId)
        +getCompletedToday(userId)
        +getOverdueByUser(userId)
        +deleteByUser(userId)
        +deleteByCategory(categoryId)
    }
    
    class CategoryRepository {
        +getByUser(userId)
        +getByName(name)
        +findByProject(projectId)
    }
    
    class StatisticsRepository {
        +getByUser(userId)
        +defaultStatistics(userId)
        +getFavoriteCategoryAnalysis(userId)
    }
    
    class UserAchievementsRepository {
        +findByUser(userId)
        +hasAchievement(userId, achievementId)
        +unlockAchievement(userId, achievementId, progress)
        +updateProgress(userId, achievementId, progress)
        +getAchievementStats(userId)
    }
    
    class EventsRepository {
        +getAllByUserId(userId)
        +getByDateRange(userId, startDate, endDate)
        +getUpcomingByUserId(userId, limit?)
    }
    
    class NotesRepository {
        +getAllByUserId(userId)
        +togglePin(id, userId)
    }
    
    class CommentLikeRepository {
        +getByComment(commentId)
        +toggleLike(userId, commentId)
        +hasUserLikedComment(userId, commentId)
        +countLikes(commentId)
        +getByUser(userId)
        +likeComment(userId, commentId)
        +unlikeComment(userId, commentId)
    }
    
    class ProjectCommentRepository {
        +getByProject(projectId)
        +getById(commentId)
        +getReplies(commentId)
    }
    
    class ProjectMemberRepository {
        +getByProject(projectId)
        +getByUser(userId)
        +isMember(projectId, userId)
        +getUserRole(projectId, userId)
        +updateRole(projectId, userId, newRoleId)
        +removeMember(projectId, userId)
    }
    
    class SubTaskRepository {
        +getAllByTaskId(taskId)
        +markAllAsCompleted(taskId)
    }
    
    class PriorityRepository {
        +getAll()
    }
    
    class RolRepository {
        +getAll()
        +getById(id)
        +getByName(name)
    }
    
    class TelegramLinkCodeRepository {
        +create(userId, code)
        +validateCode(code)
    }
    
    class ConversationRepository {
        +getByUser(userId)
        +create(conversation)
    }
    
    class MessageRepository {
        +getByConversation(conversationId)
        +create(message)
    }
    
    class AcademicGroupRepository {
        +findByCourse(courseId)
        +findByStudent(userId)
        +addMember(groupId, studentId)
    }
    
    class CourseRepository {
        +findByTeacher(teacherId)
        +findByStudent(userId)
        +findByInviteCode(code)
        +getCourseStudents(courseId)
    }
    
    class EnrollmentRepository {
        +isEnrolled(courseId, userId)
        +getCourseStudents(courseId)
    }
    
    class AssignmentRepository {
        +findByCourse(courseId)
        +getUpcomingDeadlines(days)
    }
    
    class SubjectRepository {
        +getAllByUserId(userId)
    }
    
    class SubmissionRepository {
        +findByAssignment(assignmentId)
        +findByStudent(studentId, assignmentId)
        +findByGroup(groupId, assignmentId)
        +findPendingByTeacher(teacherId)
    }
    
    class DiagramRepository {
        +getAllByUserId(userId)
    }
    
    class NotificationRepository {
        +create(notification)
    }
    
    class NotificationLogRepository {
        +logSent(log)
        +hasSent(userId, eventType, entityId)
    }
    
    class NotificationPreferencesRepository {
        +getForUser(userId)
    }

    %% ============================================
    %% SERVICES (Business Logic Layer)
    %% ============================================
    
    class UserService {
        +setCurrentUser(user)
        +getUserById(userId)
        +getAllUsers()
        +syncUserFromAuth(authUser)
        +updateUser(userId, updateData)
        +deleteUser(userId)
        +deleteAccount(userId)
        +isEmailRegistered(email)
        +changePassword(currentPassword, newPassword)
    }
    
    class ProjectService {
        +setCurrentUser(user)
        +isProjectMember(projectId, userId?)
        +isProjectAdmin(projectId, userId?)
        +getMyProjects()
        +getProjectsAsMember()
        +getAllUserProjects()
        +getById(id)
        +create(projectData)
        +update(id, projectData)
        +delete(id)
    }
    
    class TaskService {
        +setCurrentUser(user)
        +save(task, userContext?)
        +create(task)
        +update(task, userContext?)
        +delete(id, userContext?)
        +deleteByUser(userId)
        +deleteByCategory(categoryId)
        +getTasksByUser(userContext?, filter?, limit?)
        +getAll(userContext?)
        +getPendingTasks(limit?, userContext?)
        +getIncompleteByUser(userContext?)
        +getCompletedByUser(userContext?)
        +getCompletedTodayByUser(userContext?)
        +getTasksForAi(options, userContext?)
        +getById(id, userContext?)
        +updateTaskState(taskId, state, userContext?)
        +complete(id, userContext?)
        +getOverdueTasks(userContext?)
        +createAndSaveTask(title, description, endDate, priorityText, categoryText, userId)
    }
    
    class CategoryService {
        +setCurrentUser(user)
        +delete(id)
        +getAll()
        +getById(id)
        +getByName(name)
        +save(category, userOverride?)
        +update(category, userOverride?)
    }
    
    class StatisticsService {
        +setCurrentUser(user)
        +getDashboardStats(userId)
        +getHomePageStats(userId)
        +checkStreak(userId)
        +updateGeneralStats(userId)
        +checkAchievements(userId)
        +getAdditionalStats(userId)
        +getMotivationalMessage(userId)
        +getAchievementsStats(userId)
        +getByCurrentUser(userId)
        +save(statistics)
        +update(statistics)
        +updateDailyGoal(newGoal, userId)
        +getTaskStatistics(userId)
        +getFavoriteCategoryAnalysis(userId)
    }
    
    class UserAchievementsService {
        +setCurrentUser(user)
        +getByUser(userId)
        +getMyAchievements()
        +hasAchievement(userId, achievementId)
        +unlockAchievement(userId, achievementId, progress?)
        +updateProgress(userId, achievementId, progress)
        +getAchievementStats(userId)
        +resetUserAchievements(userId)
    }
    
    class AchievementValidatorService {
        +setCurrentUser(user)
        +validateAllAchievements(userId)
        +validateAchievement(userId, achievementId, preFetchedTasks?)
        +calculateProgress(userId, achievement, preFetchedTasks?)
        +onTaskCompleted(userId)
        +onTaskCreated(userId)
        +onSubtaskCreated(userId)
        +onSubtaskCompleted(userId)
        +onDailyCheck(userId)
        +recalculateAllAchievements(userId)
    }
    
    class EventsService {
        +validateEvent(event)
        +create(event, userId)
        +save(event, userId)
        +getAll(userId)
        +getById(id, userId)
        +update(event, user)
        +delete(id, userId)
        +getByDateRange(startDate, endDate, userId)
        +getUpcoming(options, userId)
        +checkUpcomingEvents(user)
    }
    
    class NotesService {
        +validateNote(note, isUpdate?)
        +create(note, userId)
        +save(note, userId)
        +getAll(userId)
        +getById(id, userId)
        +update(note, userId)
        +togglePin(id, userId)
        +delete(id, userId)
    }
    
    class CommentLikeService {
        +setCurrentUser(user)
        +canInteractWithComment(commentId, userId?)
        +getByComment(commentId)
        +toggleLike(commentId)
        +hasUserLiked(commentId)
        +countLikes(commentId)
        +getUserLikes()
        +likeComment(commentId)
        +unlikeComment(commentId)
    }
    
    class ProjectCommentService {
        +setCurrentUser(user)
        +isProjectMember(projectId, userId?)
        +getByProject(projectId)
        +getById(commentId)
        +create(projectId, commentData)
        +update(commentId, commentData)
        +delete(commentId)
        +getReplies(commentId)
        +isProjectAdmin(projectId, userId?)
    }
    
    class ProjectMemberService {
        +setCurrentUser(user)
        +isCreator(projectId, userId)
        +isAdmin(projectId, userId)
        +canManageMembers(projectId, userId?)
        +isProjectAdmin(projectId, userId?)
        +getByProject(projectId)
        +addMember(projectId, memberData)
        +updateMemberRole(projectId, userId, newRoleId)
        +removeMember(projectId, userId)
        +getUserRole(projectId, userId)
        +isMember(projectId, userId)
    }
    
    class SubTaskService {
        +setCurrentUser(user)
        +validateSubTask(subTask)
        +create(subTask)
        +complete(id)
        +save(subTask)
        +deleteByParentTask(taskId)
        +getAll()
        +getById(id)
        +update(subTask)
        +delete(id)
        +markAllAsCompleted(taskId)
        +getByTaskId(taskId)
        +getTaskIdsWithSubTasks()
    }
    
    class PriorityService {
        +getAll()
        +getById(id)
    }
    
    class RolService {
        +getAll()
        +getById(id)
        +getByName(name)
    }
    
    class TelegramService {
        +generateLinkCode(userId): Promise~any~
        +processWebhook(update): Promise~void~
        +linkUser(chatId, code): Promise~void~
        +unlinkUser(userId): Promise~boolean~
        +getStatus(userId): Promise~Object~
    }
    
    class AcademicGroupService {
        +createGroup(data, userId, role): Promise~any~
        +addMember(groupId, studentId, requesterId, role): Promise~any~
        +getGroupsByCourse(courseId, userId, role): Promise~any~
        +getMyGroups(userId): Promise~any~
    }
    
    class CourseService {
        +createCourse(data, teacherId): Promise~any~
        +getCoursesForUser(userId, role): Promise~any[]~
        +getCourseDetail(courseId, userId, role): Promise~any~
        +updateCourse(courseId, data, teacherId): Promise~any~
        +deleteCourse(courseId, teacherId): Promise~any~
        +getCourseGrades(courseId, teacherId): Promise~any[]~
    }
    
    class EnrollmentService {
        +joinByCode(inviteCode, studentId): Promise~any~
        +addStudentManually(courseId, studentEmail, teacherId): Promise~any~
        +getStudents(courseId, userId, role): Promise~any[]~
    }
    
    class AssignmentService {
        +createAssignment(data, teacherId): Promise~any~
        +getAssignmentsByCourse(courseId, userId, role): Promise~any[]~
        +getAssignmentById(id, userId, role): Promise~any~
        +updateAssignment(id, data, teacherId): Promise~any~
        +deleteAssignment(id, teacherId): Promise~any~
    }
    
    class SubjectService {
        +setCurrentUser(user): void
        +getAllByUser(): Promise~OperationResult~
        +create(subjectData): Promise~OperationResult~
        +getAverageGrade(userId): Promise~number~
    }
    
    class SubmissionService {
        +submitAssignment(data, studentId): Promise~any~
        +getSubmissions(assignmentId, userId, role): Promise~any[]~
        +gradeSubmission(submissionId, grade, feedback, teacherId): Promise~any~
        +getPendingReviews(teacherId): Promise~any[]~
    }
    
    class DiagramService {
        +setCurrentUser(user): void
        +getAllByUser(): Promise~OperationResult~
        +create(diagramData): Promise~OperationResult~
        +update(id, diagramData): Promise~OperationResult~
        +delete(id): Promise~OperationResult~
    }
    
    class NotificationService {
        +notify(params): Promise~Object~
        +checkDeadlines(): Promise~void~
    }

    %% ============================================
    %% NOTIFICATION PROVIDERS
    %% ============================================
    
    class NotificationProvider {
        +send(notification): Promise~void~
    }
    
    class EmailProvider {
        +sendEmail(params): Promise~void~
    }
    
    class TelegramProvider {
        +sendMessage(chatId, message): Promise~void~
    }
    
    class WhatsAppProvider {
        +sendWhatsApp(params): Promise~void~
    }

    %% ============================================
    %% CONTROLLERS (API Layer)
    %% ============================================
    
    class UserController {
        +injectUser: Middleware
        +syncUser(req, res): Promise~void~
        +getProfile(req, res): Promise~void~
        +updateProfile(req, res): Promise~void~
        +changePassword(req, res): Promise~void~
        +deleteAccount(req, res): Promise~void~
        +isEmailRegistered(req, res): Promise~void~
    }
    
    class ProjectController {
        +getMyProjects(req, res): Promise~void~
        +getAllUserProjects(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +delete(req, res): Promise~void~
    }
    
    class TaskController {
        +injectUser: Middleware
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +getByUser(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +delete(req, res): Promise~void~
        +complete(req, res): Promise~void~
        +deleteByCategory(req, res): Promise~void~
        +getPending(req, res): Promise~void~
    }
    
    class CategoryController {
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +delete(req, res): Promise~void~
    }
    
    class StatisticsController {
        +getDashboardStats(req, res): Promise~void~
        +getHomePageStats(req, res): Promise~void~
        +getTaskStatistics(req, res): Promise~void~
        +updateDailyGoal(req, res): Promise~void~
    }
    
    class UserAchievementsController {
        +getByUser(req, res): Promise~void~
        +getMyAchievements(req, res): Promise~void~
        +getAchievementStats(req, res): Promise~void~
        +resetUserAchievements(req, res): Promise~void~
    }
    
    class EventsController {
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +getByDateRange(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +delete(req, res): Promise~void~
        +getUpcoming(req, res): Promise~void~
        +checkUpcomingEvents(req, res): Promise~void~
    }
    
    class NotesController {
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +togglePin(req, res): Promise~void~
        +delete(req, res): Promise~void~
    }
    
    class CommentLikeController {
        +getByComment(req, res): Promise~void~
        +toggleLike(req, res): Promise~void~
        +hasUserLiked(req, res): Promise~void~
        +countLikes(req, res): Promise~void~
        +getUserLikes(req, res): Promise~void~
    }
    
    class ProjectCommentController {
        +getByProject(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +delete(req, res): Promise~void~
        +getReplies(req, res): Promise~void~
    }
    
    class ProjectMemberController {
        +getByProject(req, res): Promise~void~
        +addMember(req, res): Promise~void~
        +updateMemberRole(req, res): Promise~void~
        +removeMember(req, res): Promise~void~
        +getUserRole(req, res): Promise~void~
    }
    
    class SubTaskController {
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
        +getByTaskId(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +complete(req, res): Promise~void~
        +delete(req, res): Promise~void~
        +markAllAsCompleted(req, res): Promise~void~
    }
    
    class PriorityController {
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
    }
    
    class RolController {
        +getAll(req, res): Promise~void~
        +getById(req, res): Promise~void~
    }
    
    class TelegramController {
        +generateLinkCode(req, res): Promise~void~
        +getStatus(req, res): Promise~void~
        +unlinkUser(req, res): Promise~void~
    }
    
    class AcademicGroupController {
        +createGroup(req, res): Promise~void~
        +addMember(req, res): Promise~void~
        +getGroupsByCourse(req, res): Promise~void~
        +getMyGroups(req, res): Promise~void~
    }
    
    class CourseController {
        +createCourse(req, res): Promise~void~
        +getCoursesForUser(req, res): Promise~void~
        +getCourseDetail(req, res): Promise~void~
        +updateCourse(req, res): Promise~void~
        +deleteCourse(req, res): Promise~void~
        +getCourseGrades(req, res): Promise~void~
    }
    
    class EnrollmentController {
        +joinByCode(req, res): Promise~void~
        +addStudentManually(req, res): Promise~void~
        +getStudents(req, res): Promise~void~
    }
    
    class AssignmentController {
        +createAssignment(req, res): Promise~void~
        +getAssignmentsByCourse(req, res): Promise~void~
        +getAssignmentById(req, res): Promise~void~
        +updateAssignment(req, res): Promise~void~
        +deleteAssignment(req, res): Promise~void~
    }
    
    class SubjectController {
        +getAllByUser(req, res): Promise~void~
        +create(req, res): Promise~void~
    }
    
    class SubmissionController {
        +submitAssignment(req, res): Promise~void~
        +getSubmissions(req, res): Promise~void~
        +gradeSubmission(req, res): Promise~void~
        +getPendingReviews(req, res): Promise~void~
    }
    
    class DiagramController {
        +getAllByUser(req, res): Promise~void~
        +create(req, res): Promise~void~
        +update(req, res): Promise~void~
        +delete(req, res): Promise~void~
    }
    
    class NotificationController {
        +getAll(req, res): Promise~void~
        +getUnread(req, res): Promise~void~
        +markAsRead(req, res): Promise~void~
        +markAllAsRead(req, res): Promise~void~
        +delete(req, res): Promise~void~
    }

    %% ============================================
    %% MIDDLEWARES
    %% ============================================
    
    class AuthMiddleware {
        +verify(): Function
    }
    
    class verifySupabaseToken {
        +execute(req, res, next): Promise~void~
    }
    
    class injectUserRole {
        +execute(req, res, next): Promise~void~
    }
    
    class requireRole {
        +execute(roles): Function
    }

    %% ============================================
    %% AI COMPONENTS
    %% ============================================
    
    class AIOrchestrator {
        +process(userMessage, context): Promise~any~
    }
    
    class AIRouterAgent {
        +route(message): Promise~any~
    }
    
    class AIToolRegistry {
        +register(tools): void
        +execute(toolName, params): Promise~any~
    }
    
    class AIPrompts {
        +getPrompt(template): string
    }
    
    class AIContext {
        +addMessage(message): void
        +getContext(): any[]
    }
    
    class AIModel {
        +complete(prompt): Promise~string~
    }

    %% ============================================
    %% RELATIONSHIPS - Inheritance
    %% ============================================
    
    UserRepository --|> BaseRepository
    ProjectRepository --|> BaseRepository
    TaskRepository --|> BaseRepository
    CategoryRepository --|> BaseRepository
    StatisticsRepository --|> BaseRepository
    UserAchievementsRepository --|> BaseRepository
    EventsRepository --|> BaseRepository
    NotesRepository --|> BaseRepository
    CommentLikeRepository --|> BaseRepository
    ProjectCommentRepository --|> BaseRepository
    ProjectMemberRepository --|> BaseRepository
    SubTaskRepository --|> BaseRepository
    PriorityRepository --|> BaseRepository
    RolRepository --|> BaseRepository
    TelegramLinkCodeRepository --|> BaseRepository
    ConversationRepository --|> BaseRepository
    MessageRepository --|> BaseRepository
    AcademicGroupRepository --|> BaseRepository
    CourseRepository --|> BaseRepository
    EnrollmentRepository --|> BaseRepository
    AssignmentRepository --|> BaseRepository
    SubjectRepository --|> BaseRepository
    SubmissionRepository --|> BaseRepository
    DiagramRepository --|> BaseRepository
    NotificationRepository --|> BaseRepository
    NotificationLogRepository --|> BaseRepository
    NotificationPreferencesRepository --|> BaseRepository

    EmailProvider --|> NotificationProvider
    TelegramProvider --|> NotificationProvider
    WhatsAppProvider --|> NotificationProvider

    %% ============================================
    %% RELATIONSHIPS - Composition (*--)
    %% ============================================
    
    Task *-- SubTask : "1..*"
    Project *-- ProjectMember : "1..*"
    Project *-- Task : "1..*"
    Project *-- Category : "1..*"
    Project *-- ProjectComment : "1..*"
    Project *-- Diagram : "1..*"
    Task *-- ProjectComment : "1..*"
    Course *-- Assignment : "1..*"
    Course *-- Enrollment : "1..*"
    AcademicGroup *-- Course : "1..*"
    Assignment *-- Submission : "1..*"
    ProjectComment *-- CommentLike : "1..*"

    %% ============================================
    %% RELATIONSHIPS - Aggregation (o--)
    %% ============================================
    
    User o-- Project : "owns"
    User o-- Task : "assigned"
    User o-- UserAchievements : "earns"
    User o-- Notes : "creates"
    User o-- Events : "creates"
    User o-- ProjectComment : "writes"
    User o-- ChatMessage : "sends"
    User o-- TelegramLinkCode : "links"
    User o-- AcademicGroup : "manages"
    User o-- Enrollment : "enrolled"
    User o-- Submission : "submits"

    %% ============================================
    %% RELATIONSHIPS - Service Dependencies
    %% ============================================
    
    UserService --> UserRepository : uses
    UserService --> User : manages
    ProjectService --> ProjectRepository : uses
    ProjectService --> Project : manages
    TaskService --> TaskRepository : uses
    TaskService --> Task : manages
    CategoryService --> CategoryRepository : uses
    CategoryService --> Category : manages
    StatisticsService --> StatisticsRepository : uses
    StatisticsService --> Statistics : manages
    UserAchievementsService --> UserAchievementsRepository : uses
    UserAchievementsService --> UserAchievements : manages
    AchievementValidatorService --> UserAchievementsService : validates
    EventsService --> EventsRepository : uses
    EventsService --> Events : manages
    NotesService --> NotesRepository : uses
    NotesService --> Notes : manages
    CommentLikeService --> CommentLikeRepository : uses
    CommentLikeService --> CommentLike : manages
    ProjectCommentService --> ProjectCommentRepository : uses
    ProjectCommentService --> ProjectComment : manages
    ProjectMemberService --> ProjectMemberRepository : uses
    ProjectMemberService --> ProjectMember : manages
    SubTaskService --> SubTaskRepository : uses
    SubTaskService --> SubTask : manages
    PriorityService --> PriorityRepository : uses
    PriorityService --> Priority : manages
    RolService --> RolRepository : uses
    RolService --> Rol : manages
    TelegramService --> TelegramLinkCodeRepository : uses
    TelegramService --> TelegramLinkCode : manages
    AcademicGroupService --> AcademicGroupRepository : uses
    AcademicGroupService --> AcademicGroup : manages
    CourseService --> CourseRepository : uses
    CourseService --> Course : manages
    EnrollmentService --> EnrollmentRepository : uses
    EnrollmentService --> Enrollment : manages
    AssignmentService --> AssignmentRepository : uses
    AssignmentService --> Assignment : manages
    SubjectService --> SubjectRepository : uses
    SubjectService --> Subject : manages
    SubmissionService --> SubmissionRepository : uses
    SubmissionService --> Submission : manages
    DiagramService --> DiagramRepository : uses
    DiagramService --> Diagram : manages
    NotificationService --> NotificationRepository : uses
    NotificationService --> NotificationProvider : "uses"

    %% ============================================
    %% RELATIONSHIPS - Controller to Service
    %% ============================================
    
    UserController --> UserService : uses
    ProjectController --> ProjectService : uses
    TaskController --> TaskService : uses
    CategoryController --> CategoryService : uses
    StatisticsController --> StatisticsService : uses
    UserAchievementsController --> UserAchievementsService : uses
    EventsController --> EventsService : uses
    NotesController --> NotesService : uses
    CommentLikeController --> CommentLikeService : uses
    ProjectCommentController --> ProjectCommentService : uses
    ProjectMemberController --> ProjectMemberService : uses
    SubTaskController --> SubTaskService : uses
    PriorityController --> PriorityService : uses
    RolController --> RolService : uses
    TelegramController --> TelegramService : uses
    AcademicGroupController --> AcademicGroupService : uses
    CourseController --> CourseService : uses
    EnrollmentController --> EnrollmentService : uses
    AssignmentController --> AssignmentService : uses
    SubjectController --> SubjectService : uses
    SubmissionController --> SubmissionService : uses
    DiagramController --> DiagramService : uses
    NotificationController --> NotificationService : uses

    %% ============================================
    %% RELATIONSHIPS - AI Components
    %% ============================================
    
    AIOrchestrator --> AIRouterAgent : routes
    AIOrchestrator --> AIContext : manages
    AIOrchestrator --> AIModel : uses
    AIOrchestrator --> AIToolRegistry : executes
    AIRouterAgent --> AIPrompts : uses
    AIRouterAgent --> AIModel : uses

    %% ============================================
    %% RELATIONSHIPS - Middleware Dependencies
    %% ============================================
    
    AuthMiddleware --> verifySupabaseToken : uses
    AuthMiddleware --> injectUserRole : uses
    requireRole --> injectUserRole : uses

    %% ============================================
    %% RELATIONSHIPS - Shared Components
    %% ============================================
    
    UserService ..> OperationResult : returns
    ProjectService ..> OperationResult : returns
    TaskService ..> OperationResult : returns
    CategoryService ..> OperationResult : returns
    StatisticsService ..> OperationResult : returns
    UserAchievementsService ..> OperationResult : returns
    EventsService ..> OperationResult : returns
    NotesService ..> OperationResult : returns
    CommentLikeService ..> OperationResult : returns
    ProjectCommentService ..> OperationResult : returns
    ProjectMemberService ..> OperationResult : returns
    SubTaskService ..> OperationResult : returns
    PriorityService ..> OperationResult : returns
    RolService ..> OperationResult : returns
    TelegramService ..> OperationResult : returns
    AcademicGroupService ..> OperationResult : returns
    CourseService ..> OperationResult : returns
    EnrollmentService ..> OperationResult : returns
    AssignmentService ..> OperationResult : returns
    SubjectService ..> OperationResult : returns
    SubmissionService ..> OperationResult : returns
    DiagramService ..> OperationResult : returns
    NotificationService ..> OperationResult : returns

    %% ============================================
    %% NOTES - Testing Guidance
    %% ============================================
    
    note for UserService "Testing: Mock UserRepository. Focus: syncUserFromAuth, deleteAccount (cascading)"
    note for TaskService "Testing: Mock TaskRepository. Focus: validateTask, updateTaskState (completion logic)"
    note for StatisticsService "Testing: Mock StatisticsRepository. Focus: checkStreak logic, achievements validation"
    note for AchievementValidatorService "Testing: Mock repositories. Focus: calculateProgress, onTaskCompleted hooks"
    note for ProjectMemberService "Testing: Mock ProjectMemberRepository. Focus: permission checks, isProjectAdmin logic"
    note for EventsService "Testing: Mock EventsRepository. Focus: validateEvent, date range queries"
    note for NotesService "Testing: Mock NotesRepository. Focus: togglePin, ownership"
    note for CommentLikeService "Testing: Mock CommentLikeRepository. Focus: toggleLike, canInteract"
    note for UserController "Testing: Mock UserService. Focus: HTTP response codes"
    note for TaskController "Testing: Mock TaskService. Focus: middleware injection"
    note for BaseRepository "Testing: Use mock Supabase client. Mock: client.from().select()"
    note for OperationResult "Testing: Easy to mock. Simplified success/error handling for unit tests"
```

## Descripción de Relaciones

### Herencia (|<|--)
- **Repositorios**: Todos heredan de `BaseRepository`
- **Proveedores de Notificación**: `EmailProvider`, `TelegramProvider`, `WhatsAppProvider` heredan de `NotificationProvider`

### Composición (*--)
- `Project` contiene `Task`, `ProjectMember`, `Category`, `ProjectComment`, `Diagram`
- `Task` contiene `SubTask` y `ProjectComment`
- `Course` contiene `Assignment`, `Enrollment`
- `AcademicGroup` contiene `Course`
- `Assignment` contiene `Submission`
- `ProjectComment` contiene `CommentLike`

### Agregación (o--)
- `User` es asociado con muchos recursos: `Project`, `Task`, `Notes`, `Events`, etc.

### Dependencias de Servicio
- Cada **Controller** utiliza un **Service** correspondiente
- Cada **Service** utiliza un **Repository** y gestiona un **Model**

### Flujo de Datos
```
Controller → Service → Repository → Model
                ↓
         OperationResult
```

## Guía de Pruebas Unitarias

### Servicios (Services)
Los servicios contienen la lógica de negocio principal y devuelven `OperationResult`. Para testear:
1. **Mockear** el repositorio correspondiente
2. **Verificar** que se llama al repositorio con los parámetros correctos
3. **Verificar** el resultado de `OperationResult` (success, message, data)

### Controladores (Controllers)
Los controladores manejan HTTP requests/responses. Para testear:
1. **Mockear** el servicio correspondiente
2. **Simular** req/res con los datos de prueba
3. **Verificar** el código de estado HTTP y el cuerpo de respuesta

### Repositorios (Repositories)
Los repositorios manejan la interacción con la base de datos. Para testear:
1. **Mockear** el cliente de Supabase
2. **Verificar** las queries generadas
3. **Verificar** el mapeo de datos (mapFromDb/mapToDb)

### Casos de Prueba Prioritarios
- **TaskService**: Validación de tareas, completado, eliminación en cascada
- **StatisticsService**: Cálculo de rachas, análisis de categoría favorita
- **AchievementValidatorService**: Validación de logros, cálculo de progreso
- **ProjectMemberService**: Verificación de permisos, roles de proyecto
- **UserService**: Sincronización de auth, eliminación de cuenta
