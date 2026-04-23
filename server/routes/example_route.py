from typing import Annotated
from fastapi import APIRouter, Body, Request
from pydantic import BaseModel

from utils.endpoint_descriptions import getEndpointDescription

router = APIRouter()

success_response_message : str = "Data Received"

class Problem(BaseModel):
    problem: str

@router.post("/example_route", status_code=200)
async def receive_push_notification(
    data: Annotated[
        Problem,
        Body(
            openapi_examples = getEndpointDescription("chat1")
        )
    ],
    request: Request
):  
    return {"status": success_response_message}