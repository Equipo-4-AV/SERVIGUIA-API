import json
import os

from openai import OpenAI

from src.repo.task_store import get_task_store
from src.utils.load import load_config, load_prompt

from src.models.task_status_enum import Status
from src.models.classification_result import ClassificationResult

CONFIG = load_config()
SYSTEM_PROMPT = load_prompt()
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_store = get_task_store()

def _normalize_subcategory_mapping(config: dict) -> dict[str, list[str]]:
    mapping = {}
    valid_categories = config.get("_categorias_validas", [])
    keyword_mapping = config.get("_mapeo_keywords", {})

    for category in valid_categories:
        raw_subcategories = keyword_mapping.get(category, [])
        clean_subcategories = [sub for sub in raw_subcategories if sub != category]
        mapping[category] = clean_subcategories

    return mapping

def _build_classifier_system_content(system_prompt: str, config: dict, subcategory_mapping: dict) -> str:
    return (
        f"{system_prompt}\n"
        f"SUBCATEGORÍAS VÁLIDAS POR CATEGORÍA (Tareas/Problemas):\n"
        f"{json.dumps(subcategory_mapping, ensure_ascii=False)}\n\n"
        "REGLA ESTRICTA: Debes seleccionar exactamente una subcategoría de las listas anteriores. No inventes subcategorías."
    )

def _call_openai_json(system_content: str, history: list[dict]) -> dict:
    messages = [{"role": "system", "content": system_content}] + history

    response = _openai_client.chat.completions.create(
        model="gpt-5-nano",
        messages=messages,
        # Asegúrate de que este modelo sea el correcto, gpt-4o u otros soportados
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    return json.loads(raw)

def _post_process_classification(
    ai_result: dict,
    valid_categories: list[str],
    subcategory_mapping: dict,
) -> ClassificationResult:

    parsed_result = ClassificationResult.model_validate(ai_result)

    if parsed_result.is_emergency is True:
        parsed_result.safety_message = (
            "EMERGENCIA DETECTADA: Por favor, llame al 911 de inmediato y evacúe el area si es necesario."
        )

    if parsed_result.category not in valid_categories:
        parsed_result.category = "unknown"
        parsed_result.subcategory = ["unknown"]
        return parsed_result

    allowed_subcategories = subcategory_mapping.get(parsed_result.category, [])

    if not parsed_result.subcategory or not all(sub in allowed_subcategories for sub in parsed_result.subcategory):
        parsed_result.subcategory = ["unknown"]

    return parsed_result

def run_classification(task_id: str, user_text: str) -> None:
    try:
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

        history = task_data.get("history", [])
        attempts = task_data.get("attempts", 0)

        history.append({"role": "user", "content": user_text})

        valid_categories = CONFIG.get("_categorias_validas", [])
        subcategory_mapping = _normalize_subcategory_mapping(CONFIG)
        system_content = _build_classifier_system_content(SYSTEM_PROMPT, CONFIG, subcategory_mapping)

        raw_ai_result = _call_openai_json(system_content, history)

        final_result = _post_process_classification(
            ai_result=raw_ai_result,
            valid_categories=valid_categories,
            subcategory_mapping=subcategory_mapping
        )

        is_cat_unknown = final_result.category == "unknown"
        is_sub_unknown = not final_result.subcategory or "unknown" in final_result.subcategory

        if is_cat_unknown or is_sub_unknown:
            attempts += 1
            if attempts >= 3:
                _store.set_failed(task_id, "Cancelado: No pudimos clasificar tu problema tras 3 intentos.")
                return

            if is_cat_unknown:
                msg = "No me quedó muy claro tu problema. ¿Podrías ser un poco más específico sobre el servicio o la falla?"
            else:
                msg = f"No me quedó muy claro tu problema de {final_result.category.capitalize()}. ¿Podrías ser un poco más específico sobre el servicio?"

            history.append({"role": "assistant", "content": msg})
            _store.set_requires_clarification(task_id, msg, history, attempts)
            return

        output_payload = final_result.model_dump(by_alias=True)
        subs = final_result.subcategory
        
        if len(subs) > 1:
            subs_text = ", ".join(subs[:-1]) + f" y {subs[-1]}"
        else:
            subs_text = subs[0]

        success_msg = (
            f"Perfecto. Detectamos que buscas el servicio de {final_result.category.capitalize()} "
            f"con un enfoque en {subs_text}. "
            "Esta es la lista de proveedores recomendada:"
        )
        
        history.append({"role": "assistant", "content": success_msg})

        _store.set_completed(task_id, output_payload)
        _store.set_providers(task_id)

    except Exception as e:
        _store.set_failed(task_id, str(e))