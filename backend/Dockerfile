FROM python:3.12-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN uv --version

COPY pyproject.toml README.md ./
RUN uv sync --no-dev

RUN uv add tortoise-orm[asyncpg]>=0.21.0

COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini run.py ./

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]