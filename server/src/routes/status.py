from fastapi import APIRouter, Request
from src.repo.task_store import tasks_db
from src.utils.rate_limiter import limiter

router = APIRouter()

@router.get("/status/{task_id}")
@limiter.limit("60/minute")
async def get_status(request: Request, task_id: str):
    return tasks_db.get(task_id, {"status": "not_found"})