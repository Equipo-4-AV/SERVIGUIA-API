import json
import os
from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field

from src.repo.task_store import get_task_store
from src.utils.load import load_config, load_prompt
from src.models.task_status_enum import Status

class ClassificationResult(BaseModel):
    category: str = Field(default="unknown", alias="categoria")
    subcategories: list[str] = Field(default=["unknown"], alias="subcategorias")
    is_emergency: bool = Field(default=False, alias="es_emergencia")
    safety_message: str | None = None
    model_config = ConfigDict(extra="allow", populate_by_name=True)

CONFIG = load_config()
SYSTEM_PROMPT = load_prompt()
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_store = get_task_store()

def _normalize_subcategories_mapping(config: dict) -> dict[str, list[str]]:
    mapping = {}
    valid_categories = config.get("_categorias_validas", [])
    keyword_mapping = config.get("_mapeo_keywords", {})

    for category in valid_categories:
        raw_subcategories = keyword_mapping.get(category, [])
        clean_subcategories = [sub for sub in raw_subcategories if sub != category]
        mapping[category] = clean_subcategories

    return mapping

def _build_classifier_system_content(system_prompt: str, subcategories_mapping: dict) -> str:
    return (
        f"{system_prompt}\n"
        f"SUBCATEGORÍAS VÁLIDAS POR CATEGORÍA:\n"
        f"{json.dumps(subcategories_mapping, ensure_ascii=False)}\n\n"
        "REGLA DE FORMATO JSON:\n"
        "Responde exclusivamente con un objeto JSON:\n"
        "{\n"
        '  "categoria": "string",\n'
        '  "subcategorias": ["string"],\n'
        '  "es_emergencia": boolean\n'
        "}\n"
        "REGLA ESTRICTA: Usa solo subcategorías de la lista. No inventes términos."
    )

def _call_openai_json(system_content: str, history: list[dict]) -> dict:
    messages = [{"role": "system", "content": system_content}] + history

    response = _openai_client.chat.completions.create(
        model="gpt-4o", # O el modelo configurado en tu entorno
        messages=messages,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)

def _post_process_classification(
    ai_result: dict,
    valid_categories: list[str],
    subcategories_mapping: dict,
) -> ClassificationResult:
    try:
        parsed_result = ClassificationResult.model_validate(ai_result)
    except Exception:
        return ClassificationResult(category="unknown", subcategories=["unknown"])

    if parsed_result.is_emergency:
        parsed_result.safety_message = (
            "EMERGENCIA DETECTADA: Por favor, llame al 911 de inmediato."
        )

    if parsed_result.category not in valid_categories:
        parsed_result.category = "unknown"
        parsed_result.subcategories = ["unknown"]
        return parsed_result

    allowed = subcategories_mapping.get(parsed_result.category, [])
    clean_subs = [sub for sub in parsed_result.subcategories if sub in allowed]

    parsed_result.subcategories = clean_subs if clean_subs else ["unknown"]

    return parsed_result

def run_classification(task_id: str, user_text: str) -> None:
    try:
        if not CONFIG or not SYSTEM_PROMPT:
            _store.set_failed(task_id, "Configuración o Prompt faltantes")
            return

        task_data = _store.get(task_id)
        if task_data.get("status") == Status.NOT_FOUND:
            _store.set_failed(task_id, "task_id no encontrado")
            return

        history = task_data.get("history", [])
        attempts = task_data.get("attempts", 0)
        history.append({"role": "user", "content": user_text})

        valid_categories = CONFIG.get("_categorias_validas", [])
        sub_mapping = _normalize_subcategories_mapping(CONFIG)
        system_content = _build_classifier_system_content(SYSTEM_PROMPT, sub_mapping)

        raw_ai_result = _call_openai_json(system_content, history)
        final_result = _post_process_classification(raw_ai_result, valid_categories, sub_mapping)

        is_cat_unknown = final_result.category == "unknown"
        is_sub_unknown = not final_result.subcategories or "unknown" in final_result.subcategories

        if is_cat_unknown or is_sub_unknown:
            attempts += 1
            if attempts >= 3:
                _store.set_failed(task_id, "Cancelado: No se pudo clasificar tras 3 intentos.")
                return

            msg = "No me quedó muy claro el problema. ¿Podrías ser más específico?"
            if not is_cat_unknown:
                msg = f"No me quedó claro el problema de {final_result.category.capitalize()}. ¿Podrías dar más detalles?"

            history.append({"role": "assistant", "content": msg})
            _store.set_requires_clarification(task_id, msg, history, attempts)
            return

        subs = final_result.subcategories
        subs_text = ", ".join(subs[:-1]) + f" y {subs[-1]}" if len(subs) > 1 else subs[0]
        
        success_msg = (
            f"Perfecto. Detectamos un servicio de {final_result.category} "
            f"enfocado en {subs_text}."
        )
        
        history.append({"role": "assistant", "content": success_msg})
        _store.set_completed(task_id, final_result.model_dump(by_alias=True))
        _store.set_providers(task_id)

    except Exception as e:
        _store.set_failed(task_id, str(e))