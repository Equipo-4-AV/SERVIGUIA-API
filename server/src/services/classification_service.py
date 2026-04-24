import json
import os

from openai import OpenAI

from src.models.classification import ClassificationResult
from src.repo.task_store import get_task_store
from src.utils.load import load_workers, load_config, load_prompt

# ==================== CORE ====================

CONFIG = load_config()
SYSTEM_PROMPT = load_prompt()
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_store = get_task_store()


# ==================== UTILS ====================

def _normalize_keyword_mapping(config: dict) -> dict:
    mapping = dict(config["_mapeo_keywords"])
    for cat in config["_categorias_validas"]:
        if cat not in mapping:
            mapping[cat] = []
        if cat not in mapping[cat]:
            mapping[cat].append(cat)
    return mapping


def _build_classifier_system_content(system_prompt: str, config: dict, mapping: dict) -> str:
    return (
        f"{system_prompt}\n"
        f"CATEGORIAS VALIDAS: {config['_categorias_validas']}\n"
        f"DICCIONARIO DE KEYWORDS: {json.dumps(mapping, ensure_ascii=False)}"
    )


def _call_openai_json(system_content: str, user_text: str) -> dict:
    response = _openai_client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_text},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    return json.loads(raw)


def _post_process_classification(
    ai_result: dict,
    categorias_validas: list[str],
) -> ClassificationResult:
    parsed_result = ClassificationResult.model_validate(ai_result)

    if parsed_result.es_emergencia is True:
        parsed_result.mensaje_seguridad = (
            "EMERGENCIA DETECTADA: Por favor, llame al 911 de inmediato y evacúe el area si es necesario."
        )
    if parsed_result.categoria not in categorias_validas:
        parsed_result.categoria = "desconocido"

    return parsed_result


# ==================== MAIN SERVICE ====================


def run_classification(
    task_id: str,
    user_text: str,
) -> None:
    try:
        if not isinstance(CONFIG, dict) or not CONFIG:
            _store.set_failed(task_id, "CONFIG no disponible")
            return

        if not isinstance(SYSTEM_PROMPT, str) or not SYSTEM_PROMPT.strip():
            _store.set_failed(task_id, "SYSTEM_PROMPT no disponible")
            return

        mapping = _normalize_keyword_mapping(CONFIG)
        system_content = _build_classifier_system_content(SYSTEM_PROMPT, CONFIG, mapping)
        ai_result = _call_openai_json(system_content, user_text)
        ai_result = _post_process_classification(ai_result, CONFIG["_categorias_validas"])
        _store.set_completed(task_id, ai_result.model_dump())
    except Exception as e:
        _store.set_failed(task_id, str(e))
