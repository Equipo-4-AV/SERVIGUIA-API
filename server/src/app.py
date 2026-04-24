import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError

#rate limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from src.utils.rate_limiter import limiter

from src.routes.recommendation_route import router as recommendation_router
from src.routes.status import router as status_router #!not fully implemented but needed for testing
from src.routes.enqueue_prompt import router as enqueue_prompt_router
from src.routes.kickoff import router as kickoff_router
from src.utils.load import load_prompt

from src.middlewares.internal_error_handler import InternalErrorHandler

project_name = "ServiAPI"

#region APIKEY check
@asynccontextmanager
async def lifespan(app: FastAPI):
    #! check if .env contains key
    if not os.getenv("OPENAI_API_KEY"): #? Log errors in english?
        raise RuntimeError("OPENAI_API_KEY no configurada. Abortando inicio del servidor.")
    #! check if system prompt is loaded
    if not load_prompt():
        raise RuntimeError("System prompt no cargado. Abortando inicio del servidor.")

    yield

app = FastAPI(
    lifespan = lifespan,
    title = project_name,
    description = f"""
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
    }
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(InternalErrorHandler)

# region Root
@app.get("/")
@limiter.limit("5/minute") #! for limiter to work, must add request param to route
def read_root(request : Request):
    return {"service": project_name}

@app.get("/api")
@limiter.limit("5/minute")
def read_api(request : Request):
    return {"message": f"From these routes, we receive data via push notifications from {os.getenv('CLIENT_APP')}"}

#region routers
app.include_router(recommendation_router, prefix="/api")
app.include_router(status_router, prefix="/api")
app.include_router(kickoff_router, prefix="/api")
app.include_router(enqueue_prompt_router, prefix="/api")

@app.exception_handler(RequestValidationError)
async def handle_422(request: Request, exc: RequestValidationError):
    body = await request.body()
    print("422 Error. Body was:", body.decode())
    return {"status_code" : 422, "detail": "Invalid data"}