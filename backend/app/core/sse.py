"""SSE event broadcaster for real-time task updates."""

import asyncio
import json
from collections import defaultdict
from typing import Annotated, AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user, decode_token
from app.models.models import User

router = APIRouter(tags=["sse"],prefix="/sse")


class EventEmitter:
    """Simple in-memory SSE broadcaster."""

    def __init__(self):
        self._subscribers: dict[int, asyncio.Queue] = defaultdict(asyncio.Queue)

    async def subscribe(self, project_id: int) -> AsyncIterator[bytes]:
        """Subscribe to task events for a project. Yields encoded SSE messages."""
        queue = self._subscribers[project_id]
        try:
            while True:
                message = await queue.get()
                yield f"data: {message}\n\n".encode()
        finally:
            del self._subscribers[project_id]

    async def emit(self, project_id: int, event: str, data: dict):
        """Broadcast an event to all subscribers of a project."""
        queue = self._subscribers[project_id]
        message = json.dumps({"event": event, **data})
        await queue.put(message)


emitter = EventEmitter()


@router.get("/projects/{project_id}/events")
async def task_events(
    project_id: int,
    token: Annotated[str, Query(alias="token")],
):
    """SSE endpoint: streams task events for a project (task_created, task_updated, task_deleted)."""
    token_data = decode_token(token)
    if token_data.user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return StreamingResponse(
        emitter.subscribe(project_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
