import os
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

#rate limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from src.middlewares.rate_limiter import limiter

from src.routes.status import router as status_router #!not fully implemented but needed for testing
from src.routes.enqueue_prompt import router as enqueue_prompt_router
from src.routes.kickoff import router as kickoff_router
from src.routes.output import router as output_router
from src.routes.auth import router as auth_router

#middleware
from src.middlewares.internal_error_handler import InternalErrorHandler
from src.middlewares.lifespan import lifespan_handler

project_name = "ServiAPI"

app = FastAPI(
    lifespan = lifespan_handler,
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

origins = [
    "http://localhost:3000",      # Para tus pruebas locales de producción
    "http://localhost:5173",      # Para tu entorno de desarrollo con Vite (Vite watch)
    "http://2.25.187.252:3000",
    "https://serviguia.online",
]

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(InternalErrorHandler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(status_router, prefix="/api")
app.include_router(output_router, prefix="/api")
app.include_router(kickoff_router, prefix="/api")
app.include_router(enqueue_prompt_router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def handle_422(request: Request, exc: RequestValidationError):
    body = await request.body()
    return {"status_code" : 422, "detail": "Invalid data"}