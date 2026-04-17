import logging
import sys

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tortoise import Tortoise

from app.core.config import settings
from app.core.seed import seed_db
from app.core.sse import router as sse_router
from app.routers import auth, projects

# Configure loguru as the root logger for app-wide use
logger = logging.getLogger(__name__)


def configure_logging() -> None:
    """Configure structured logging for the application."""
    # Remove default handlers and configure loguru
    logging.root.handlers = []
    logging.root.setLevel(logging.INFO)

    # Stream logs to stdout with structured format
    sys.stdout.reconfigure(line_buffering=True)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    logger.info(f"Starting {settings.app_env} environment...")

    database_url = settings.database_url_sync.replace("postgresql://", "postgres://")
    logger.info(f"Database URL: {database_url.split('@')[0] if '@' in database_url else 'localhost'}")

    await Tortoise.init(
        db_url=database_url,
        modules={"models": ["app.models.models"]},
        _enable_global_fallback=True,
    )

    if settings.debug:
        logger.info("Generating Tortoise schema...")
        await Tortoise.generate_schemas()
        logger.info("Seeding database...")
        await seed_db()

    logger.info("TaskFlow API started successfully")
    yield

    logger.info("TaskFlow API shutting down...")
    await Tortoise.close_connections()
    logger.info("TaskFlow API shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="TaskFlow API",
        description="Task management API for Greening India Assignment",
        version="0.1.0",
        lifespan=lifespan,
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(projects.router)
    app.include_router(sse_router)
    return app


app = create_app()


@app.get("/health", response_class=JSONResponse)
async def health_check() -> JSONResponse:
    """Health check endpoint. Returns 200 with status."""
    logger.debug("Health check requested")
    return JSONResponse(
        status_code=200,
        content={"status": "healthy"},
    )