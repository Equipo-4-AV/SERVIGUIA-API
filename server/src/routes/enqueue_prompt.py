from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from src.repo.task_store import InMemoryTaskStore, get_task_store
from src.models.prompt import PromptRequest
from src.services.classification_service import run_classification
from src.utils.rate_limiter import limiter

router = APIRouter()

@router.post("/prompt")
@limiter.limit("5/minute")
async def enqueue_prompt_classification(
    request: Request,
    data: PromptRequest,
    background_tasks: BackgroundTasks,
    store: Annotated[InMemoryTaskStore, Depends(get_task_store)],
) -> dict[str, str | bool]:
    if not store.has(data.task_id):
        store.set_failed(data.task_id, "task_id no encontrado")
        raise HTTPException(status_code=404, detail="task_id no encontrado")

    store.set_processing(data.task_id)
    background_tasks.add_task(run_classification, data.task_id, data.context)
    return {"task_id": data.task_id, "enqueued": True}
