import os
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute

from routes.example_route import router as test_router

project_name = "ServiAPI"

app = FastAPI(
    title=project_name,
    description=f"""
*{project_name}*

## Description

FastAPI server for {os.getenv('PARTNER_SERVICE')}

## Purpose

Receives input data of user form mobile app: {os.getenv('CLIENT_APP')}
""",
    summary="Python server with Worker implementation (AI + Recomendation Algorithm).",
    version="0.0.1",
    contact={
        "name": "Equipo 4",
        # "email": "",
    }
)

# region Root
@app.get("/")
def read_root():
    return {project_name}

@app.get("/api")
def read_api():
    return {f"From these routes, we receive data via push notifications from {os.getenv('CLIENT_APP')}"}


@app.include_router(test_router, prefix="/api/test/")

@app.exception_handler(RequestValidationError)
async def handle_422(request: Request, exc: RequestValidationError):
    body = await request.body()
    print("422 Error. Body was:", body.decode())
    return {"status_code" : 422, "detail": "Invalid data"}

# For test purposes
@app.post("/api/serverMessageTest", status_code=200)
async def send_prediction_to_game(request: Request):
    payload = await request.json()

    return {"status": "Message sent", "activity": payload['activity']}

# ! Print all routes locally
for route in app.routes:
    if isinstance(route, APIRoute):
        print(f"{route.path} -> {', '.join(route.methods)}")