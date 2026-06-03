from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from src.middlewares.rate_limiter import limiter
from src.repo.task_store import InMemoryTaskStore, get_task_store
from src.models.output_response import OutputResponse
from src.utils.security import get_current_user

router = APIRouter()

@router.get("/output/{task_id}")
@limiter.limit("10/minute") #! if the user decides to  refresh a lot
async def get_output(
    request: Request,
    store: Annotated[InMemoryTaskStore, Depends(get_task_store)],
    task_id: str,
    user_id: str = Depends(get_current_user),
):
    if not store.has(task_id):
        store.set_failed(task_id, "task_id not found in store")
        raise HTTPException(status_code=404, detail="task_id not found in store")
    
    task_data = store.get(task_id)
    status = task_data.get("status")
    providers : OutputResponse= task_data.get("providers")

    if not providers:
        # return {"status": status, "providers": "No providers"}
        return {"detail": "recomendation not ready yet"}

    return {"status": status, "providers": providers}