import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request

from src.repo.task_store import InMemoryTaskStore, get_task_store
from src.middlewares.rate_limiter import limiter

router = APIRouter()

@router.post("/kickoff")
@limiter.limit("5/minute")
async def create_kickoff_task(
    request: Request,
    store: Annotated[InMemoryTaskStore, Depends(get_task_store)],
) -> dict[str, str]:
    task_id = str(uuid.uuid4())
    store.create_placeholder(task_id)
    return {"task_id": task_id}
