import math
import pytest
from unittest.mock import patch

from src.services.recommendation_service import (
    _calculate_score,
    get_top_by_category_and_subs,
    get_categories,
)
from src.utils.load import load_config, load_workers

# region helpers 

@pytest.fixture
def config():
    return load_config()

@pytest.fixture
def norm(config):
    return config["_normalizacion"]

def make_worker(**overrides):
    """Genera un trabajador de prueba con todos los campos requeridos por Raw_Worker."""
    base = {
        "id": "T000",
        "nombre": "Test Worker",
        "categoria": "plomeria",
        "subcategorias": ["fuga", "tuberia"],
        "insignias": [], # Campo faltante corregido
        "calificacion": 4.0,
        "num_reviews": 20,
        "precio_hora": 180,
        "disponible": True,
        "experiencia_años": 5,
        "trabajos_completados": 100,
        "zona": "Centro",
        "telefono": "6620000000",
    }
    base.update(overrides)
    return base

# region _calculate_score 

class TestCalculateScore:
    def test_returns_float(self, config, norm):
        worker = make_worker()
        score = _calculate_score(worker, config, norm, [])
        assert isinstance(score, float)

    def test_score_between_0_and_1(self, config, norm):
        worker = make_worker()
        score = _calculate_score(worker, config, norm, [])
        assert 0.0 <= score <= 1.0

    def test_perfect_worker_scores_higher_than_bad_worker(self, config, norm):
        # Un trabajador con insignias y calificación perfecta debe ganar
        elite = make_worker(
            calificacion=5.0, 
            num_reviews=99, 
            insignias=["reputacion", "rapidez", "calidad"]
        )
        bad = make_worker(calificacion=1.5, num_reviews=1, insignias=[])
        assert _calculate_score(elite, config, norm, []) > _calculate_score(bad, config, norm, [])

    def test_subcategory_match_boosts_score(self, config, norm):
        specialist = make_worker(subcategorias=["fuga", "tuberia"])
        generalist = make_worker(subcategorias=["calentador", "cisterna"])
        requested  = ["fuga", "tuberia"]
        
        score_specialist = _calculate_score(specialist, config, norm, requested)
        score_generalist = _calculate_score(generalist, config, norm, requested)
        assert score_specialist > score_generalist

    def test_no_subcategories_requested_gives_full_sub_norm(self, config, norm):
        w = make_worker(calificacion=3.0, num_reviews=10, insignias=["pro"])
        score_no_subs = _calculate_score(w, config, norm, [])
        
        lambda_ = config["lambda"]
        c_norm  = w["calificacion"] / norm["calificacion_max"]
        r_score = 1 - math.exp(-lambda_ * w["num_reviews"])
        # B_norm usa insignias, no subcategorias
        b_norm  = min(len(w["insignias"]) / norm["badges_max"], 1.0)
        
        expected = (
            config["calificacion"]         * c_norm
            + config["reviews_suavizados"] * r_score
            + config["badges"]             * b_norm
            + config["subcategoria"]       * 1.0
        )
        assert abs(score_no_subs - expected) < 1e-9

    def test_exponential_review_smoothing(self, config, norm):
        w = make_worker(num_reviews=1000)
        score = _calculate_score(w, config, norm, [])
        assert score <= 1.0

# region get_top_by_category 

class TestGetTopByCategory:
    def test_returns_list(self):
        result = get_top_by_category_and_subs("plomeria")
        assert isinstance(result, list)

    def test_default_limit_is_10(self):
        result = get_top_by_category_and_subs("plomeria")
        assert len(result) <= 10

    def test_all_results_match_category(self):
        for provider in get_top_by_category_and_subs("electricidad"):
            # Usando el atributo del modelo Service_Provider
            assert provider.category == "electricidad"

    def test_unavailable_workers_excluded(self):
        result = get_top_by_category_and_subs("plomeria", limit=10)
        ids = [p.id for p in result]
        
        # Obtenemos los IDs de los que sabemos que no están disponibles en el JSON real
        unavailable = [w["id"] for w in load_workers() 
                       if w["categoria"] == "plomeria" and not w["disponible"]]
        
        for uid in unavailable:
            assert uid not in ids

    def test_sorted_best_first(self):
        result = get_top_by_category_and_subs("plomeria", limit=10)
        # El primero debe tener mejor o igual rating que el último
        assert result[0].rating >= result[-1].rating

    def test_subcategory_boost_changes_order(self):
        def w(id, cal, rev, subs):
            return {
                "id": id, "nombre": f"Worker {id}", "categoria": "plomeria",
                "subcategorias": subs, "calificacion": cal, "num_reviews": rev,
                "insignias": [], # Corregido aquí también
                "precio_hora": 180, "disponible": True, "experiencia_años": 5,
                "trabajos_completados": 100, "zona": "Centro", "telefono": "6620000000",
            }

        workers = [
            w("T_01", 4.8, 80, ["tuberia"]),      # Mejor score base
            w("T_02", 4.2, 30, ["calentador"]),   # Score base bajo, pero match en subcat
        ]

        with patch("src.services.recommendation_service.load_workers", return_value=workers):
            generic  = get_top_by_category_and_subs("plomeria")
            specific = get_top_by_category_and_subs("plomeria", subcategories=["calentador"])

        assert generic[0].id == "T_01"
        assert specific[0].id == "T_02"

# region get_categories 

class TestGetCategories:
    def test_contains_expected_categories(self):
        cats = get_categories()
        expected = {"plomeria", "electricidad", "pintura"}
        assert expected.issubset(set(cats))