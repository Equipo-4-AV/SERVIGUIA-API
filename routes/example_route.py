from typing import Annotated
from fastapi import APIRouter, Body, Request


from utils.endpoint_descriptions import getEndpointDescription

router = APIRouter()

success_response_message : str = "Data Received"

class Problem: {
    "problems" : str
}

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
    print("Received push notification.")
    return {"status": success_response_message}