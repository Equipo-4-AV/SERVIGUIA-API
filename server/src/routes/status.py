from fastapi import APIRouter, Request

from src.repo.task_store import tasks_db
from src.middlewares.rate_limiter import limiter

from src.models.task_status_enum import Status

router = APIRouter()

@router.get("/status/{task_id}")
@limiter.limit("60/minute")
async def get_status(request: Request, task_id: str):
    task_data = tasks_db.get(task_id, {"status": Status.NOT_FOUND})
    
    return {k: v for k, v in task_data.items() if k != "providers"}