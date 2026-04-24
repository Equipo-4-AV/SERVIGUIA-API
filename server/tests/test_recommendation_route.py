"""
Integration tests for GET /api/categorias and GET /api/recomendacion

Uses a lightweight test app that includes only the recommendation router,
avoiding the OPENAI_API_KEY / system-prompt lifespan checks from main.py.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.recommendation_route import router


@pytest.fixture(scope="module")
def client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    return TestClient(app)


# ── GET /api/categorias ───────────────────────────────────────────────────────

class TestCategoriasEndpoint:
    def test_status_200(self, client):
        res = client.get("/api/categorias")
        assert res.status_code == 200

    def test_response_has_categorias_key(self, client):
        data = client.get("/api/categorias").json()
        assert "categorias" in data

    def test_categorias_is_list(self, client):
        data = client.get("/api/categorias").json()
        assert isinstance(data["categorias"], list)

    def test_categorias_not_empty(self, client):
        data = client.get("/api/categorias").json()
        assert len(data["categorias"]) > 0


# ── GET /api/recomendacion ────────────────────────────────────────────────────

class TestRecomendacionEndpoint:
    def test_valid_category_returns_200(self, client):
        res = client.get("/api/recomendacion?categoria=plomeria")
        assert res.status_code == 200

    def test_response_structure(self, client):
        data = client.get("/api/recomendacion?categoria=plomeria").json()
        assert "categoria"   in data
        assert "total"       in data
        assert "proveedores" in data

    def test_categoria_field_matches_query(self, client):
        data = client.get("/api/recomendacion?categoria=electricidad").json()
        assert data["categoria"] == "electricidad"

    def test_default_limit_is_10(self, client):
        data = client.get("/api/recomendacion?categoria=plomeria").json()
        assert data["total"] <= 10
        assert len(data["proveedores"]) <= 10

    def test_custom_limit(self, client):
        data = client.get("/api/recomendacion?categoria=plomeria&limit=3").json()
        assert data["total"] == 3
        assert len(data["proveedores"]) == 3

    def test_provider_fields_present(self, client):
        proveedores = client.get("/api/recomendacion?categoria=plomeria").json()["proveedores"]
        required = {"id", "nombre", "categoria", "rating", "badges", "rango_precio", "disponibilidad"}
        for p in proveedores:
            assert required.issubset(p.keys())

    def test_invalid_category_returns_404(self, client):
        res = client.get("/api/recomendacion?categoria=magia")
        assert res.status_code == 404

    def test_missing_categoria_param_returns_422(self, client):
        res = client.get("/api/recomendacion")
        assert res.status_code == 422

    def test_limit_above_max_returns_422(self, client):
        res = client.get("/api/recomendacion?categoria=plomeria&limit=11")
        assert res.status_code == 422

    def test_limit_below_min_returns_422(self, client):
        res = client.get("/api/recomendacion?categoria=plomeria&limit=0")
        assert res.status_code == 422

    def test_all_categories_return_results(self, client):
        categorias = client.get("/api/categorias").json()["categorias"]
        for cat in categorias:
            res = client.get(f"/api/recomendacion?categoria={cat}")
            assert res.status_code == 200, f"Falló para categoría: {cat}"
