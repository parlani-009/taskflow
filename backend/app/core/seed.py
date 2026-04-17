from datetime import date, timedelta

from app.core.security import get_password_hash
from app.models.models import User, Project, Task, TaskStatus, TaskPriority


async def seed_db() -> None:
    # Check if already seeded
    if await User.exists():
        print("Database already seeded, skipping...")
        return

    # Create test user
    await User.create(
        name="Test User",
        email="test@example.com",
        password=get_password_hash("password123"),
    )

    # Create project
    project = await Project.create(
        name="Website Redesign",
        description="Complete redesign of company website",
        owner_id=1,
    )

    # Create tasks with different statuses
    await Task.create(
        title="Design homepage mockup",
        description="Create wireframes and high-fidelity mockups for new homepage",
        status=TaskStatus.DONE,
        priority=TaskPriority.HIGH,
        project_id=project.id,
        assignee_id=1,
        due_date=str(date.today() - timedelta(days=5)),
    )
    await Task.create(
        title="Implement authentication",
        description="Add JWT-based auth to mobile app",
        status=TaskStatus.IN_PROGRESS,
        priority=TaskPriority.HIGH,
        project_id=project.id,
        assignee_id=1,
        due_date=str(date.today() + timedelta(days=7)),
    )
    await Task.create(
        title="Write API docs",
        description="Document all REST endpoints with examples",
        status=TaskStatus.TODO,
        priority=TaskPriority.MEDIUM,
        project_id=project.id,
        assignee_id=None,
        due_date=str(date.today() + timedelta(days=14)),
    )

    print("Database seeded successfully!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_db())