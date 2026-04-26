from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from src.middlewares.rate_limiter import limiter

from src.repo.task_store import InMemoryTaskStore, get_task_store
from src.services.classification_service import run_classification

from src.models.prompt_request import PromptRequest
from src.models.task_status_enum import Status

router = APIRouter()

@router.post("/prompt/{task_id}")
@limiter.limit("5/minute")
async def enqueue_prompt_classification(
    request: Request,
    data: PromptRequest,
    background_tasks: BackgroundTasks,
    store: Annotated[InMemoryTaskStore, Depends(get_task_store)],
    task_id: str
) -> dict[str, str | bool]:
    if not store.has(task_id):
        store.set_failed(task_id, "task_id not found in store")
        raise HTTPException(status_code=404, detail="task_id not found in store")

    task_data = store.get(task_id)
    current_status = task_data.get("status")

    if current_status == Status.COMPLETED:
        return {"task_id": task_id, "enqueued": True, "detail": "result is ready in corresponding endpoint"}

    elif current_status == Status.FAILED:
        return {"task_id": task_id, "enqueued": False, "detail": "create a new task_id via kickoff endpoint"}

    elif current_status not in [Status.REQUIRES_CLARIFICATION, Status.STARTING]:
        return {"task_id": task_id, "enqueued": True, "detail": "service is processing"}

    store.set_processing(task_id)

    background_tasks.add_task(run_classification, task_id, data.context)
    return {"task_id": task_id, "enqueued": True, "detail": "service is processing"}
