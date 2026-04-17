# Migration Plan: Desktop to Web (Captus)

## Overview
This document outlines the guided migration of relevant code and functionalities from the C# desktop application (CaptusGUI) to the web version using React + Vite frontend, Node.js + Express backend, and Supabase/Postgres database. The migration follows Bulletproof React architecture and prioritizes MVP features.

## Phases
- **Phase 1 (MVP)**: Task management (CRUD including subtasks), user management (register/login), categories/priorities, streaks system.
- **Phase 2**: Email notifications, work groups, document management.
- **Phase 3**: AI integration, UML editor, multi-channel notifications.

## Technical Mapping
- **Entities**: C# ENTITY classes → Postgres tables via Supabase.
- **DAL**: Data access logic → Backend services/repositories.
- **BLL**: Business logic → Backend services/controllers.
- **Presentation**: WinForms → React components following Bulletproof structure.

## Steps Executed
1. [ ] Create `feature/web-migration` branch.
2. [ ] Add MIGRATION_PLAN.md.
3. [ ] Analyze desktop codebase structure.
4. [ ] Generate SQL DDL/migrations for database schema.
5. [ ] Implement backend models and services for tasks/users.
6. [ ] Add unit tests for services.
7. [ ] Create API controllers and routes.
8. [ ] Implement authentication with Supabase Auth.
9. [ ] Build frontend MVP with task management UI.
10. [ ] Integrate streaks functionality.
11. [ ] Add Swagger documentation.
12. [ ] Write integration tests.
13. [ ] Update README with migration notes.
14. [ ] Open PR for MVP.

## Decisions and Notes
- Use Supabase for auth and DB to simplify migration.
- Maintain UTC for dates in DB, convert in frontend.
- For passwords: If migrating existing users, implement secure re-hashing or force reset.
- Handle concurrency with timestamps.
- Document any ambiguities in business rules with TODOs.

## Commits
- Each major change will have a descriptive commit message.

## Testing
- Unit tests for services (Jest).
- Integration tests for APIs (Supertest).
- Aim for 60-70% coverage on migrated entities.

## Acceptance Criteria
- CRUD tasks/subtasks via UI with DB persistence.
- User register/login with JWT.
- Streak calculation and display.
- Documented endpoints.
- Deployable locally.