import uuid
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from src.repo.task_store import tasks_db, get_task_store
from src.services.classification_service import run_classification

# ─── Constantes ─────────────────────────────────────────────────────────────

REGISTER_URL = "/api/auth/register"
LOGIN_URL    = "/api/auth/login"
KICKOFF_URL  = "/api/kickoff"

# Respuestas simuladas de OpenAI (nunca toca la API real)
MOCK_SUCCESS = {
    "categoria": "plomeria",
    "subcategorias": ["fuga", "tuberia"],
    "es_emergencia": False,
}
MOCK_EMERGENCY = {
    "categoria": "plomeria",
    "subcategorias": ["fuga"],
    "es_emergencia": True,
}
MOCK_UNKNOWN = {
    "categoria": "unknown",
    "subcategorias": ["unknown"],
    "es_emergencia": False,
}


# ─── Fixtures y helpers ──────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_task_store():
    tasks_db.clear()
    yield
    tasks_db.clear()


def _auth_headers(client: TestClient) -> dict:
    client.post(REGISTER_URL, json={"email": "ai@test.com", "password": "pass123"})
    res = client.post(LOGIN_URL, json={"email": "ai@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _make_task() -> str:
    task_id = str(uuid.uuid4())
    get_task_store().create_placeholder(task_id)
    return task_id


# ─── Endpoints HTTP ──────────────────────────────────────────────────────────

class TestKickoff:
    def test_crea_task_id(self, client: TestClient):
        res = client.post(KICKOFF_URL, headers=_auth_headers(client))
        assert res.status_code == 200
        assert "task_id" in res.json()

    def test_task_id_es_uuid_valido(self, client: TestClient):
        res = client.post(KICKOFF_URL, headers=_auth_headers(client))
        uuid.UUID(res.json()["task_id"])  # lanza ValueError si no es UUID válido


class TestStatus:
    def test_task_inexistente_regresa_not_found(self, client: TestClient):
        res = client.get("/api/status/id-inexistente", headers=_auth_headers(client))
        assert res.json()["status"] == "not_found"

    def test_tarea_nueva_tiene_status_starting(self, client: TestClient):
        headers = _auth_headers(client)
        task_id = client.post(KICKOFF_URL, headers=headers).json()["task_id"]
        res = client.get(f"/api/status/{task_id}", headers=headers)
        assert res.json()["status"] == "starting"


class TestOutput:
    def test_output_antes_de_completar_no_esta_listo(self, client: TestClient):
        headers = _auth_headers(client)
        task_id = client.post(KICKOFF_URL, headers=headers).json()["task_id"]
        res = client.get(f"/api/output/{task_id}", headers=headers)
        assert res.json() == {"detail": "recomendation not ready yet"}

    def test_output_de_tarea_completada_tiene_providers(self, client: TestClient):
        headers = _auth_headers(client)
        task_id = _make_task()  # crea la tarea directo en el store, sin HTTP

        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_SUCCESS):
            run_classification(task_id, "fuga de agua en la cocina")

        res = client.get(f"/api/output/{task_id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "completed"
        assert isinstance(data["providers"], list)
        assert len(data["providers"]) > 0


# ─── Servicio de clasificación (sin HTTP, sin OpenAI real) ───────────────────

class TestClasificacionExitosa:
    def test_tarea_queda_completed(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_SUCCESS):
            run_classification(task_id, "se rompió una tubería y hay fuga")
        assert get_task_store().get(task_id)["status"].value == "completed"

    def test_resultado_tiene_categoria_correcta(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_SUCCESS):
            run_classification(task_id, "fuga de agua")
        result = get_task_store().get(task_id)["result"]
        assert result["categoria"] == "plomeria"
        assert "fuga" in result["subcategorias"]

    def test_providers_son_asignados_despues_de_clasificar(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_SUCCESS):
            run_classification(task_id, "fuga de agua")
        task = get_task_store().get(task_id)
        assert task.get("providers") is not None
        assert len(task["providers"]) > 0

    def test_subcategoria_invalida_del_llm_es_filtrada(self):
        task_id = _make_task()
        mock_con_sub_inventada = {
            "categoria": "plomeria",
            "subcategorias": ["fuga", "sub_inventada_por_llm"],
            "es_emergencia": False,
        }
        with patch("src.services.classification_service._call_openai_json", return_value=mock_con_sub_inventada):
            run_classification(task_id, "fuga en el baño")
        result = get_task_store().get(task_id)["result"]
        assert "sub_inventada_por_llm" not in result["subcategorias"]
        assert "fuga" in result["subcategorias"]


class TestEmergencia:
    def test_emergencia_queda_completed(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_EMERGENCY):
            run_classification(task_id, "hay olor a gas en la casa")
        assert get_task_store().get(task_id)["status"].value == "completed"

    def test_emergencia_tiene_safety_message_con_911(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_EMERGENCY):
            run_classification(task_id, "hay olor a gas en la casa")
        result = get_task_store().get(task_id)["result"]
        assert result.is_emergency is True
        assert "911" in (result.safety_message or "")

    def test_emergencia_no_asigna_providers(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_EMERGENCY):
            run_classification(task_id, "hay olor a gas en la casa")
        assert get_task_store().get(task_id).get("providers") is None


class TestClarificacion:
    def test_categoria_desconocida_pide_clarificacion(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_UNKNOWN):
            run_classification(task_id, "tengo un problema en casa")
        assert get_task_store().get(task_id)["status"].value == "requires_clarification"

    def test_mensaje_de_clarificacion_esta_en_historial(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_UNKNOWN):
            run_classification(task_id, "tengo un problema")
        task = get_task_store().get(task_id)
        historial = task.get("history", [])
        mensajes_asistente = [m for m in historial if m["role"] == "assistant"]
        assert len(mensajes_asistente) > 0

    def test_tres_intentos_fallidos_marca_tarea_como_failed(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_UNKNOWN):
            run_classification(task_id, "problema")        # intento 1 → clarificación
            run_classification(task_id, "más info")        # intento 2 → clarificación
            run_classification(task_id, "no sé explicar")  # intento 3 → failed
        assert get_task_store().get(task_id)["status"].value == "failed"

    def test_contador_de_intentos_incrementa(self):
        task_id = _make_task()
        with patch("src.services.classification_service._call_openai_json", return_value=MOCK_UNKNOWN):
            run_classification(task_id, "problema")
            run_classification(task_id, "más info")
        assert get_task_store().get(task_id)["attempts"] == 2
