import json
import os
import base64

from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field

from src.repo.task_store import get_task_store
from src.utils.load import load_config, load_prompt
from src.models.task_status_enum import Status
from src.models.classification_result import ClassificationResult

# ==================== CORE ====================


CONFIG = load_config()
SYSTEM_PROMPT = load_prompt()
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_store = get_task_store()


# ==================== UTILS ====================


def _prepare_user_message(user_text: str, image_bytes: bytes | None = None) -> dict:
    """Prepara el contenido multimodal para OpenAI."""
    content = [{"type": "text", "text": user_text}]

    if image_bytes:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
        })

    return {"role": "user", "content": content}


def _normalize_subcategory_mapping(config: dict) -> dict[str, list[str]]:
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
        "REGLA ESTRICTA: Debes seleccionar al menos una o varias subcategoría de las listas anteriores. No inventes subcategorías."
    )

def _call_openai_json(system_content: str, history: list[dict]) -> dict:
    messages = [{"role": "system", "content": system_content}] + history

    response = _openai_client.chat.completions.create(
        model="gpt-5-nano",
        messages=messages,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    return json.loads(raw)

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
            "EMERGENCIA DETECTADA: Por favor, llame al 911 de inmediato y evacúe el area si es necesario."
        )

    if parsed_result.category not in valid_categories:
        parsed_result.category = "unknown"
        parsed_result.subcategories = ["unknown"]
        return parsed_result

    allowed = subcategories_mapping.get(parsed_result.category, [])
    clean_subs = [sub for sub in parsed_result.subcategories if sub in allowed]

    parsed_result.subcategories = clean_subs if clean_subs else ["unknown"]

    return parsed_result


def _get_clarification_needed(result: ClassificationResult) -> tuple[bool, str]:
    """Determina si el resultado requiere clarificación y genera el mensaje."""
    is_cat_unknown = result.category == "unknown"
    is_sub_unknown = result.subcategories == ["unknown"]

    if not is_cat_unknown and not is_sub_unknown:
        return False, ""

    if is_cat_unknown:
        return True, "No me quedó muy claro tu problema. ¿Podrías ser un poco más específico sobre el servicio o la falla?"

    return True, f"No me quedó muy claro tu problema de {result.category.capitalize()}. ¿Podrías ser un poco más específico?"


def _format_success_response(result: ClassificationResult) -> str:
    """Genera el mensaje de éxito amigable para el usuario."""
    subs = result.subcategories
    subs_text = ", ".join(subs[:-1]) + f" y {subs[-1]}" if len(subs) > 1 else subs[0]

    return (
        f"Perfecto. Detectamos que buscas el servicio de {result.category.capitalize()} "
        f"con un enfoque en {subs_text}."
    )


# ==================== MAIN SERVICE ====================


def run_classification(task_id: str, user_text: str, image_bytes: bytes | None = None) -> None:
    try:
        # Initial validations
        if not isinstance(CONFIG, dict) or not CONFIG:
            _store.set_failed(task_id, "CONFIG is missing or invalid")
            return

        if not isinstance(SYSTEM_PROMPT, str) or not SYSTEM_PROMPT.strip():
            _store.set_failed(task_id, "SYSTEM_PROMPT is missing or invalid")
            return

        task_data = _store.get(task_id)
        if task_data.get("status") == Status.NOT_FOUND:
            _store.set_failed(task_id, "task_id not found in store")
            return


        # Prepare user task data
        history = task_data.get("history", [])
        attempts = task_data.get("attempts", 0)

        new_message = _prepare_user_message(user_text, image_bytes)
        history.append(new_message)


        # Classification
        system_content = _build_classifier_system_content(
            SYSTEM_PROMPT, _normalize_subcategory_mapping(CONFIG)
        )
        raw_ai_result = _call_openai_json(system_content, history)

        final_result = _post_process_classification(
            raw_ai_result, CONFIG.get("_categorias_validas", []), _normalize_subcategory_mapping(CONFIG)
        )


        # Check if we need clarification
        needs_clarification, clarif_msg = _get_clarification_needed(final_result)

        if needs_clarification:
            attempts += 1
            if attempts >= 3:
                _store.set_failed(task_id, "Cancelado: Demasiados intentos sin éxito.")
                return

            history.append({"role": "assistant", "content": clarif_msg})
            _store.set_requires_clarification(task_id, clarif_msg, history, attempts)
            return


        # Send final result
        success_msg = _format_success_response(final_result)
        history.append({"role": "assistant", "content": success_msg})

        _store.set_completed(task_id, final_result.model_dump(by_alias=True))
        _store.set_providers(task_id)

    except Exception as e:
        _store.set_failed(task_id, f"Error en el servicio: {str(e)}")