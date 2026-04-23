from fastapi import APIRouter, Request
from utils.rate_limiter import limiter
from .kickoff import tasks_db  # local tasks #TODO change format

router = APIRouter()

@router.get("/status/{task_id}")
@limiter.limit("5/minute")
async def get_status(request: Request, task_id: str):
    return tasks_db.get(task_id, {"status": "not_found"})