import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.utils.load import load_config, load_prompt

@asynccontextmanager
async def lifespan_handler(app: FastAPI):
    #! check if .env contains key
    if not os.getenv("OPENAI_API_KEY"): #? Log errors in english?
        raise RuntimeError("OPENAI_API_KEY no configurada. Abortando inicio del servidor.")
    #! check if system prompt is loaded
    if not load_prompt():
        raise RuntimeError("System prompt no cargado. Abortando inicio del servidor.")
    
    if not load_config():
        raise RuntimeError("Configuración no cargado. Abortando inicio del servidor.")

    yield