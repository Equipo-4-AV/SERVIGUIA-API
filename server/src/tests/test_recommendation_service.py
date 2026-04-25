"""
Unit tests for services/recommendation.py

Tests the scoring formula, price range tiers, and the main
get_top_by_category function using the real trabajadores.json data.
"""
import math
import pytest

from src.services.recommendation import (
    _calculate_score,
    get_top_by_category,
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
    base = {
        "id": "T000",
        "nombre": "Test Worker",
        "categoria": "plomeria",
        "subcategorias": ["fugas", "tuberias"],
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
        elite = make_worker(calificacion=5.0, num_reviews=99, subcategorias=["fugas", "tuberias", "drenaje", "calentadores", "bomba", "cisterna", "instalacion"])
        bad   = make_worker(calificacion=1.5, num_reviews=1,  subcategorias=[])
        assert _calculate_score(elite, config, norm, []) > _calculate_score(bad, config, norm, [])

    def test_subcategory_match_boosts_score(self, config, norm):
        specialist = make_worker(subcategorias=["fugas", "tuberias"])
        generalist = make_worker(subcategorias=["calentadores", "cisterna"])
        requested  = ["fugas", "tuberias"]
        score_specialist = _calculate_score(specialist, config, norm, requested)
        score_generalist = _calculate_score(generalist, config, norm, requested)
        assert score_specialist > score_generalist

    def test_no_subcategories_requested_gives_full_sub_norm(self, config, norm):
        # sub_norm should be 1.0 when no subcategories are requested
        w = make_worker(calificacion=3.0, num_reviews=10, subcategorias=["fugas"])
        score_no_subs = _calculate_score(w, config, norm, [])
        # Manually compute expected score with sub_norm=1.0
        lambda_ = config["lambda"]
        c_norm  = w["calificacion"] / norm["calificacion_max"]
        r_score = 1 - math.exp(-lambda_ * w["num_reviews"])
        b_norm  = min(len(w["subcategorias"]) / norm["badges_max"], 1.0)
        expected = (
            config["calificacion"]         * c_norm
            + config["reviews_suavizados"] * r_score
            + config["badges"]             * b_norm
            + config["subcategoria"]       * 1.0
        )
        assert abs(score_no_subs - expected) < 1e-9

    def test_exponential_review_smoothing(self, config, norm):
        # 1000 reviews should not give a score > 1 (exponential caps at 1)
        w = make_worker(num_reviews=1000)
        score = _calculate_score(w, config, norm, [])
        assert score <= 1.0

    def test_higher_reviews_means_higher_score_same_everything_else(self, config, norm):
        few    = make_worker(num_reviews=5)
        many   = make_worker(num_reviews=80)
        assert _calculate_score(many, config, norm, []) > _calculate_score(few, config, norm, [])

# region get_top_by_category 

class TestGetTopByCategory:
    def test_returns_list(self):
        result = get_top_by_category("plomeria")
        assert isinstance(result, list)

    def test_default_limit_is_10(self):
        result = get_top_by_category("plomeria")
        assert len(result) <= 10

    def test_custom_limit_respected(self):
        result = get_top_by_category("plomeria", limit=3)
        assert len(result) == 3

    def test_all_results_match_category(self):
        for provider in get_top_by_category("electricidad"):
            assert provider.category == "electricidad"

    def test_unavailable_workers_excluded(self):
        # Every category has exactly 1 worker with disponible=False in test data
        result = get_top_by_category("plomeria", limit=10)
        ids = [p.id for p in result]
        # Confirm unavailable plomeros are excluded (T010 is disponible=False)
        unavailable = [w["id"] for w in load_workers()
                       if w["categoria"] == "plomeria" and not w["disponible"]]
        for uid in unavailable:
            assert uid not in ids

    def test_sorted_best_first(self):
        # First provider should have a higher rating than the last
        result = get_top_by_category("plomeria", limit=10)
        assert result[0].rating >= result[-1].rating

    def test_invalid_category_returns_empty(self):
        result = get_top_by_category("magia")
        assert result == []

    def test_case_insensitive_category(self):
        lower  = get_top_by_category("plomeria")
        upper  = get_top_by_category("PLOMERIA")
        assert [p.id for p in lower] == [p.id for p in upper]

    def test_subcategory_boost_changes_order(self):
        from unittest.mock import patch

        def w(id, cal, rev, subs):
            return {
                "id": id, "nombre": f"Worker {id}", "categoria": "plomeria",
                "subcategorias": subs, "calificacion": cal, "num_reviews": rev,
                "precio_hora": 180, "disponible": True, "experiencia_años": 5,
                "trabajos_completados": 100, "zona": "Centro", "telefono": "6620000000",
            }

        # 5 workers WITHOUT calentadores — higher base scores, dominate generic ranking
        # 5 workers WITH calentadores — lower base scores, rise to top when boost applies
        workers = [
            w("T_01", 4.6, 65, ["fugas", "tuberias", "drenaje"]),
            w("T_02", 4.4, 50, ["calentadores", "cisterna"]),
            w("T_03", 4.5, 55, ["fugas", "instalacion sanitaria"]),
            w("T_04", 4.3, 45, ["calentadores", "hidroneumatico"]),
            w("T_05", 4.4, 48, ["drenaje", "bomba de agua"]),
            w("T_06", 4.2, 40, ["calentadores", "fugas", "tuberias"]),
            w("T_07", 4.1, 35, ["instalacion sanitaria", "tuberias"]),
            w("T_08", 4.0, 30, ["calentadores"]),
            w("T_09", 3.8, 25, ["fugas"]),
            w("T_10", 3.6, 20, ["calentadores", "cisterna", "drenaje"]),
        ]

        with patch("src.services.recommendation.load_workers", return_value=workers):
            generic  = get_top_by_category("plomeria", limit=10)
            specific = get_top_by_category("plomeria", subcategories=["calentadores"], limit=10)

        # Without boost: T_01 wins (best base score — high rating + many reviews)
        assert generic[0].id == "T_01"
        # With calentadores boost: T_02 jumps to first (non-calentadores workers drop to sub_norm=0)
        assert specific[0].id == "T_02"
        assert [p.id for p in generic] != [p.id for p in specific]


# region get_categories 

class TestGetCategories:
    def test_returns_list(self):
        cats = get_categories()
        assert isinstance(cats, list)

    def test_contains_expected_categories(self):
        cats = get_categories()
        expected = {"plomeria", "electricidad", "pintura", "limpieza",
                    "carpinteria", "aire acondicionado", "cerrajeria",
                    "jardineria", "herreria"}
        assert expected.issubset(set(cats))

    def test_not_empty(self):
        assert len(get_categories()) > 0
