"""
Integration tests for TaskFlow auth and task endpoints.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://0.0.0.0:8000") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: "AsyncClient"):
    await client.post("/auth/register", json={
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "testpassword123",
    })
    resp = await client.post("/auth/login", json={
        "email": "testuser@example.com",
        "password": "testpassword123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_login_with_valid_credentials_returns_token(client: AsyncClient):
    """POST /auth/login returns access_token on valid credentials."""
    await client.post("/auth/register", json={
        "name": "Alice",
        "email": "alice@example.com",
        "password": "alicepass",
    })
    resp = await client.post("/auth/login", json={
        "email": "alice@example.com",
        "password": "alicepass",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_create_task_and_update_its_status(client: AsyncClient, auth_headers: dict):
    """POST /projects/:id/tasks creates a task; PATCH /projects/tasks/:id updates it."""
    proj = await client.post("/projects/", json={"name": "Task Test Project"}, headers=auth_headers)
    project_id = proj.json()["id"]

    create_resp = await client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "My Task", "status": "todo", "priority": "high"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    update_resp = await client.patch(
        f"/projects/tasks/{task_id}",
        json={"status": "done"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "done"


@pytest.mark.asyncio
async def test_delete_task_removes_it_from_the_system(client: AsyncClient, auth_headers: dict):
    """DELETE /projects/tasks/:id removes the task; a subsequent GET returns 404."""
    proj = await client.post("/projects/", json={"name": "Delete Test Project"}, headers=auth_headers)
    project_id = proj.json()["id"]

    create_resp = await client.post(
        f"/projects/{project_id}/tasks",
        json={"title": "To Delete"},
        headers=auth_headers,
    )
    task_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/projects/tasks/{task_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/projects/tasks/{task_id}", headers=auth_headers)
    assert get_resp.status_code == 404