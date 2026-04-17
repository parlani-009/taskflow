# TaskFlow Backend

FastAPI task management API for the Greening India Assignment.

## Stack

- **FastAPI** — async web framework
- **Tortoise-ORM** — async ORM (Django-like)
- **PostgreSQL** — database
- **JWT** — token-based authentication
- **bcrypt** — password hashing

## Quick Start

```bash
docker compose up --build
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get token |
| GET | `/auth/me` | Get current user |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List user's projects |
| POST | `/projects` | Create project |
| GET | `/projects/{id}` | Get project with tasks |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |
| GET | `/projects/{id}/tasks` | List tasks (filter by status, assignee) |
| POST | `/projects/{id}/tasks` | Create task |
| PATCH | `/projects/tasks/{id}` | Update task |
| DELETE | `/projects/tasks/{id}` | Delete task |

## Environment

See `.env.example` for required variables.