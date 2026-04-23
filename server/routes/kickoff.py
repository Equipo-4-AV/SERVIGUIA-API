import os
import uuid
import json
from fastapi import APIRouter, Request, BackgroundTasks
from pydantic import BaseModel
from openai import OpenAI

from utils.load import load_data, load_prompt
from utils.rate_limiter import limiter

router = APIRouter()

WORKERS, CONFIG = load_data() #!load data to be refactor later
SYSTEM_PROMPT = load_prompt()


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
tasks_db = {}

class KickoffRequest(BaseModel):
    descripcion: str

# region Service
def process_classification(task_id: str, user_text: str):
    try:
        mapping = CONFIG["_mapeo_keywords"]
        for cat in CONFIG["_categorias_validas"]:
            if cat not in mapping[cat]:
                mapping[cat].append(cat)

        contexto_dinamico = (
            f"{SYSTEM_PROMPT}\n"
            f"CATEGORIAS VALIDAS: {CONFIG['_categorias_validas']}\n"
            f"DICCIONARIO DE KEYWORDS: {json.dumps(mapping, ensure_ascii=False)}"
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": contexto_dinamico},
                {"role": "user", "content": user_text}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        ai_result = json.loads(response.choices[0].message.content)
        
        if ai_result.get("es_emergencia") is True:
            ai_result["mensaje_seguridad"] = "EMERGENCIA DETECTADA: Por favor, llame al 911 de inmediato y evacúe el área si es necesario."
        
        if ai_result.get("categoria") not in CONFIG["_categorias_validas"]:
            ai_result["categoria"] = "desconocido"

        tasks_db[task_id] = {
            "status": "completed", 
            "result": ai_result
        }
    except Exception as e:
        tasks_db[task_id] = {"status": "failed", "error": str(e)}


# region KICKOFF
@router.post("/kickoff")
@limiter.limit("5/minute")
async def kickoff(request: Request, data: KickoffRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    tasks_db[task_id] = {"status": "processing"}
    
    background_tasks.add_task(process_classification, task_id, data.descripcion)
    
    return {"task_id": task_id}
