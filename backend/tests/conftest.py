"""
conftest.py — set up Tortoise ORM and a test database for all tests.
"""

import pytest
import pytest_asyncio
from tortoise import Tortoise

from app.main import app


@pytest.fixture(scope="session")
def event_loop_policy():
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def init_db():
    """Initialize Tortoise with an in-memory SQLite DB before each test, close after."""
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={"models": ["app.models.models"]},
        _enable_global_fallback=True,
    )
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()