# TaskFlow

A real-time collaborative task management application built for the [Greening India Assignment](https://github.com/rishabhsharma-go/Greening-India-Assingment/).

## Overview

TaskFlow is a project and task management system with a Kanban-style board. Users can create projects, add tasks organized by status (To Do, In Progress, Done) and priority, assign tasks to team members, and track progress through a live statistics drawer.

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React + TypeScript (Vite) | Fast dev server, type-safe, component-based |
| **Styling** | Tailwind CSS | Utility-first, responsive, minimal bundle |
| **Backend** | FastAPI (Python) | Async-first, OpenAPI auto-docs, Pydantic validation |
| **ORM** | Tortoise-ORM | Django-like async ORM for PostgreSQL |
| **Database** | PostgreSQL 16 | ACID-compliant, relational, production-grade |
| **Auth** | JWT (HS256) + bcrypt | Stateless token auth, secure password hashing |
| **Real-time** | Server-Sent Events (SSE) | Lightweight push updates without WebSocket complexity |
| **Containerization** | Docker Compose | One-command local dev environment |

## Architecture Decisions

### Backend Structure
- **FastAPI + Tortoise-ORM**: Chosen for full async I/O — database queries don't block the event loop, making SSE keep-alive connections practical at scale.
- **Pydantic schemas inline in routers**: Kept simple without a separate `schemas/` directory for projects/tasks, since the project scope didn't warrant it.
- **JWT in Authorization header**: Standard Bearer token; the `get_current_user` dependency extracts the user ID from the `sub` claim.
- **SSE via in-memory emitter**: The `emitter` singleton broadcasts events to all connected clients per project. This works for single-instance deployments but would need Redis pub/sub for horizontal scaling.

### Frontend Structure
- **React functional components + hooks**: No Redux/Context overkill — local state + prop drilling for this scope.
- **TypeScript types in `src/types.ts`**: Centralized types for `User`, `Project`, `Task`.
- **Drag-and-drop via HTML5 DnD API**: Native browser DnD, no extra library. Works for the basic use case; SSE lag can be felt during rapid column drops.
- **SSE connection per KanbanBoard mount**: Each board opens its own `/projects/{id}/events` stream and cleans up on unmount.

### What Was Deliberately Left Out
- **No WebSocket / no multi-user cursor**: SSE is one-way (server → client). Real-time collab features like live cursors would need WebSockets.
- **No background workers**: Task reminders, email notifications, and scheduled jobs were out of scope.
- **No role-based access control beyond owner/assignee**: Projects are either owned or accessible through task assignment. No fine-grained permissions.
- **No unit/integration tests**: Time budget went to features; test coverage is minimal.

## Running Locally

**Prerequisites:** Docker and Docker Compose installed.

```bash
git clone https://github.com/parlani-009/taskflow
cd taskflow

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env 2>/dev/null || cp frontend/.env.example frontend/.env

# Start all services (PostgreSQL, API, Frontend)
docker compose up --build

# App available at http://localhost:3000
```

## Running Migrations

Tortoise-ORM auto-generates the schema when `DEBUG=true` (the default in `.env`). On first startup it runs `Tortoise.generate_schemas()` automatically as part of the lifespan handler. No manual migration steps are needed.

If you need to reset the database:

```bash
docker compose down -v    # Removes the named volume (wipes all data)
docker compose up --build # Fresh start with auto-migration
```

## Test Credentials

The database is seeded on first startup with a test user:

| Field | Value |
|-------|-------|
| **Email** | `test@example.com` |
| **Password** | `password123` |

A sample project "Website Redesign" with three pre-populated tasks is also created during seeding.

## API Reference

Base URL: `http://localhost:8000`

**Authentication:** All endpoints except `/auth/*` require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

### Auth

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| `POST` | `/auth/register` | Register new user | `{"name": "string", "email": "string", "password": "string"}` | `{"id": int, "name": "string", "email": "string"}` |
| `POST` | `/auth/login` | Login | `{"email": "string", "password": "string"}` | `{"access_token": "string", "token_type": "bearer"}` |
| `GET` | `/auth/me` | Get current user | — | `{"id": int, "name": "string", "email": "string"}` |

### Projects

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| `GET` | `/projects` | List user's projects (paginated) | Query: `page`, `limit` | `{"items": [...], "total": int, "page": int, "limit": int, "total_pages": int}` |
| `POST` | `/projects` | Create project | `{"name": "string", "description": "string?"}` | `{"id": int, "name": "string", "description": "string?", "owner_id": int}` |
| `GET` | `/projects/{id}` | Get project with all tasks | — | `{"project": {...}, "tasks": [...]}` |
| `PATCH` | `/projects/{id}` | Update project | `{"name": "string?", "description": "string?"}` | `{"id": int, "name": "string", ...}` |
| `DELETE` | `/projects/{id}` | Delete project and its tasks | — | `{"status": "ok", "message": "string"}` |
| `GET` | `/projects/{id}/stats` | Task counts by assignee and status | — | `{"total": int, "stats": {"assignee_id": {"todo": int, "in_progress": int, "done": int}}}` |

### Tasks

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| `GET` | `/projects/{id}/tasks` | List tasks (filterable, paginated) | Query: `status`, `assignee`, `page`, `limit` | `{"items": [...], "total": int, "page": int, "limit": int, "total_pages": int}` |
| `POST` | `/projects/{id}/tasks` | Create task | `{"title": "string", "description": "string?", "status": "todo\|in_progress\|done", "priority": "low\|medium\|high", "assignee_id": int?, "due_date": "YYYY-MM-DD?"}` | `{"id": int, "title": "string", ...}` |
| `GET` | `/projects/tasks/{id}` | Get single task | — | `{"id": int, "title": "string", "description": "string?", "status": "string", "priority": "string", "project_id": int, "assignee_id": int?, "due_date": "string?"}` |
| `PATCH` | `/projects/tasks/{id}` | Update task | Any task field | `{"id": int, "title": "string", ...}` |
| `DELETE` | `/projects/tasks/{id}` | Delete task | — | `{"status": "ok", "message": "string"}` |

### Users

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/projects/users/all` | List all users (for assignee picker) | `[{"id": int, "name": "string", "email": "string"}, ...]` |

### Real-time (SSE)

| Path | Description |
|------|-------------|
| `GET /projects/{id}/events` | SSE stream for project events. Events: `task_created`, `task_updated`, `task_deleted`. Payload: `{"event": "string", "data": {...}}` |

### Health

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/health` | `{"status": "healthy"}` |

## What I'd Do With More Time

**1. Fix SSE lag on drag-and-drop**
The current SSE implementation can lag during rapid drag-and-drop operations because the in-memory emitter broadcasts sequentially. With more time I'd batch SSE emissions or move to a proper pub/sub backend (Redis) so the frontend updates feel instant.

**2. Write cleaner backend queries**
The project uses Tortoise-ORM well for simple cases, but some queries (like the stats aggregation in `get_project_stats`) do multiple loops in Python rather than pushing logic to the database. I'd rewrite those as raw SQL with proper indexing.

**3. Implement drag-and-drop between projects**
Currently tasks can only be dragged between columns within one project. Cross-project task movement would require additional UI state and API support.

**4. Better frontend architecture**
With more time I'd break the frontend into smaller components, add proper error boundaries, and consider a light state management solution. The current monolithic components work but aren't as maintainable.

**5. Add a proper data validation layer**
I relied heavily on AI to accelerate the initial implementation, which was a pragmatic tradeoff given my current company is a startup. With more time I'd do a thorough review of edge cases, add comprehensive input validation, and ensure all error states are handled gracefully.

**6. Use Django instead of FastAPI**
For a task management app with complex relationships and multiple developers, Django's built-in admin, ORM patterns, and extensive ecosystem would reduce boilerplate and improve maintainability. FastAPI was chosen for its async performance, but Django is a better fit for this domain.

**7. Add tests**
Comprehensive test coverage for both API endpoints and frontend interactions would be essential before any production deployment.
