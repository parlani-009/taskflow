import logging
import math

from fastapi import APIRouter, Depends, status, Query
from fastapi.responses import JSONResponse
from tortoise.exceptions import DoesNotExist

from pydantic import BaseModel

from app.core.security import get_current_user
from app.core.sse import emitter
from app.models.models import Project, Task, User

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)

NOT_AUTHORIZED = "not authorized"

# --- Request Schemas ---
class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"
    assignee_id: int | None = None
    due_date: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_id: int | None = None
    due_date: str | None = None


# --- Helpers ---
def _not_found_json(resource: str) -> dict:
    return {"error": f"{resource} not found"}


def _project_dict(p: Project) -> dict:
    """Convert a Project model instance to a plain dict."""
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "owner_id": p.owner_id,
    }


def _task_dict(t: Task) -> dict:
    """Convert a Task model instance to a plain dict."""
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "project_id": t.project_id,
        "assignee_id": t.assignee_id,
        "due_date": str(t.due_date),
    }


# =============================================================================
# Projects
# =============================================================================

@router.get("/")
async def list_projects(
    page: int = Query(1, ge=1, alias="page"),
    limit: int = Query(10, ge=1, le=100, alias="limit"),
    user_id: int = Depends(get_current_user),
) -> JSONResponse:
    """List all projects accessible to the user: owned + assigned via tasks. Paginated."""
    # Projects owned by the user
    owned = await Project.filter(owner_id=user_id).all()

    # Project IDs where the user is a task assignee
    assigned_ids = [
        t.project_id for t in
        await Task.filter(assignee_id=user_id).only("project_id").all()
    ]

    assigned = await Project.filter(id__in=assigned_ids).all() if assigned_ids else []

    # Deduplicate: keep owned first, add assigned only if new
    seen = {p.id for p in owned}
    combined = list(owned)
    for p in assigned:
        if p.id not in seen:
            combined.append(p)
            seen.add(p.id)

    total = len(combined)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    start = (page - 1) * limit
    end = start + limit
    paginated = combined[start:end]

    logger.info(f"GET /projects/ — user_id={user_id} returned {len(paginated)}/{total} projects")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "items": [_project_dict(p) for p in paginated],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        },
    )


@router.post("/")
async def create_project(project_in: ProjectCreate, user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Create a new project. Returns 201 with the created project."""
    project = await Project.create(
        name=project_in.name,
        description=project_in.description,
        owner_id=user_id,
    )
    logger.info(f"POST /projects/ — user_id={user_id} created project_id={project.id}")
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
        },
    )


@router.get("/{project_id}")
async def get_project(project_id: int, user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Get a single project with all its tasks. Returns 404 if not found."""
    try:
        project = await Project.get(id=project_id)
    except DoesNotExist:
        logger.warning(f"GET /projects/{project_id} — not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    tasks = await Task.filter(project_id=project_id).all()
    logger.info(f"GET /projects/{project_id} — user_id={user_id} returned project+tasks")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"project": _project_dict(project), "tasks": [_task_dict(t) for t in tasks]},
    )


@router.patch("/{project_id}")
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    user_id: int = Depends(get_current_user),
) -> JSONResponse:
    """Update project name/description. Returns 404 if not found, 403 if not owner."""
    try:
        project = await Project.get(id=project_id)
    except DoesNotExist:
        logger.warning(f"PATCH /projects/{project_id} — not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    if project.owner_id != user_id:
        logger.warning(f"PATCH /projects/{project_id} — forbidden, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": NOT_AUTHORIZED},
        )

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description

    await project.save()
    logger.info(f"PATCH /projects/{project_id} — updated by user_id={user_id}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
        },
    )


@router.delete("/{project_id}")
async def delete_project(project_id: int, user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Delete a project and all its tasks. Returns 404 if not found, 403 if not owner."""
    try:
        project = await Project.get(id=project_id)
    except DoesNotExist:
        logger.warning(f"DELETE /projects/{project_id} — not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    if project.owner_id != user_id:
        logger.warning(f"DELETE /projects/{project_id} — forbidden, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": NOT_AUTHORIZED},
        )

    # Delete all tasks belonging to this project
    tasks = await Task.filter(project_id=project_id).all()
    for task in tasks:
        await task.delete()

    await project.delete()
    logger.info(f"DELETE /projects/{project_id} — deleted by user_id={user_id}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "ok", "message": "Project deleted"},
    )


# =============================================================================
# Tasks
# =============================================================================

@router.get("/{project_id}/tasks")
async def list_tasks(
    project_id: int,
    status_filter: str | None = Query(None, alias="status"),
    assignee_filter: int | None = Query(None, alias="assignee"),
    page: int = Query(1, ge=1, alias="page"),
    limit: int = Query(10, ge=1, le=100, alias="limit"),
    user_id: int = Depends(get_current_user),
) -> JSONResponse:
    """List tasks for a project, optionally filtered by status and/or assignee. Paginated."""
    try:
        await Project.get(id=project_id)
    except DoesNotExist:
        logger.warning(f"GET /projects/{project_id}/tasks — project not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    filters = {"project_id": project_id}
    if status_filter:
        filters["status"] = status_filter
    if assignee_filter:
        filters["assignee_id"] = assignee_filter

    tasks = await Task.filter(**filters).all()
    total = len(tasks)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    start = (page - 1) * limit
    end = start + limit
    paginated = tasks[start:end]

    logger.info(f"GET /projects/{project_id}/tasks — user_id={user_id} returned {len(paginated)}/{total} tasks")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "items": [_task_dict(t) for t in paginated],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        },
    )


@router.post("/{project_id}/tasks")
async def create_task(
    project_id: int,
    task_in: TaskCreate,
    user_id: int = Depends(get_current_user),
) -> JSONResponse:
    """Create a task in a project. Returns 404 if project not found."""
    try:
        await Project.get(id=project_id)
    except DoesNotExist:
        logger.warning(f"POST /projects/{project_id}/tasks — project not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    task = await Task.create(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        project_id=project_id,
        assignee_id=task_in.assignee_id,
        due_date=task_in.due_date,
    )
    logger.info(f"POST /projects/{project_id}/tasks — created task_id={task.id} by user_id={user_id}")
    await emitter.emit(project_id, "task_created", {"task": _task_dict(task)})
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "project_id": task.project_id,
            "assignee_id": task.assignee_id,
            "due_date": str(task.due_date),
        },
    )


@router.get("/tasks/{task_id}")
async def get_task(task_id: int, user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Get a single task by ID. Returns 404 if not found."""
    try:
        task = await Task.get(id=task_id)
    except DoesNotExist:
        logger.warning(f"GET /projects/tasks/{task_id} — not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Task"),
        )

    logger.info(f"GET /projects/tasks/{task_id} — user_id={user_id}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=_task_dict(task),
    )


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    user_id: int = Depends(get_current_user),
) -> JSONResponse:
    """Update a task. Returns 404 if not found."""
    try:
        task = await Task.get(id=task_id)
    except DoesNotExist:
        logger.warning(f"PATCH /projects/tasks/{task_id} — not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Task"),
        )

    try:
        await Project.get(id=task.project_id)
    except DoesNotExist:
        logger.error(f"PATCH /projects/tasks/{task_id} — project not found, task orphaned")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    await task.save()

    logger.info(f"PATCH /projects/tasks/{task_id} — updated by user_id={user_id}")
    await emitter.emit(task.project_id, "task_updated", {"task": _task_dict(task)})
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "project_id": task.project_id,
            "assignee_id": task.assignee_id,
            "due_date": str(task.due_date),
        },
    )


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Delete a task. Returns 404 if not found, 403 if not owner/assignee."""
    try:
        task = await Task.get(id=task_id)
    except DoesNotExist:
        logger.warning(f"DELETE /projects/tasks/{task_id} — not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Task"),
        )

    try:
        project = await Project.get(id=task.project_id)
    except DoesNotExist:
        logger.error(f"DELETE /projects/tasks/{task_id} — project not found, task orphaned")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    if project.owner_id != user_id and task.assignee_id != user_id:
        logger.warning(f"DELETE /projects/tasks/{task_id} — forbidden, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": NOT_AUTHORIZED},
        )

    await task.delete()
    logger.info(f"DELETE /projects/tasks/{task_id} — deleted by user_id={user_id}")
    await emitter.emit(project.id, "task_deleted", {"task_id": task_id})
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "ok", "message": "Task deleted"},
    )


# =============================================================================
# Stats
# =============================================================================

@router.get("/{project_id}/stats")
async def get_project_stats(project_id: int, user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Get task statistics for a project: counts by status, unassigned, and per assignee."""
    try:
        await Project.get(id=project_id)
    except DoesNotExist:
        logger.warning(f"GET /projects/{project_id}/stats — project not found, user_id={user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_not_found_json("Project"),
        )

    tasks = await Task.filter(project_id=project_id).all()
    total_task_count = len(tasks)
    by_assignee:dict[str,list[Task]] = {}

    for task in tasks:
        if not by_assignee.get(str(task.assignee_id)):
            by_assignee[str(task.assignee_id)] = []     
        by_assignee[str(task.assignee_id)].append(task)        
    
    stats = {}
    for assigned_id, tasks in by_assignee.items():
        if not stats.get(assigned_id):
            stats[assigned_id] = {"todo": 0, "in_progress": 0, "done": 0}
        
        for task in tasks:
            stats[assigned_id][task.status] += 1
        
    logger.info(f"GET /projects/{project_id}/stats — user_id={user_id} total={len(tasks)} tasks")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "total": total_task_count,
            "stats": stats
        },
    )


# =============================================================================
# Users
# =============================================================================

@router.get("/users/all")
async def get_all_users(user_id: int = Depends(get_current_user)) -> JSONResponse:
    """Return all users (id, name, email). Used for assignee picker."""
    users = await User.filter().only("name", "id", "email")
    result = [{"id": u.id, "name": u.name, "email": u.email} for u in users]
    logger.info(f"GET /projects/users/all — user_id={user_id} returned {len(result)} users")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=result,
    )