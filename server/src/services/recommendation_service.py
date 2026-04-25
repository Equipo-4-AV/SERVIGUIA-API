import math

from src.models.service_provider import Service_Provider
from src.models.norm_config import NormConfig
from src.models.raw_worker import Raw_Worker

from src.utils.load import load_workers, load_config

# --- Scoring ---

def _calculate_score(
    worker: Raw_Worker,
    weights: dict,
    norm: NormConfig,
    subcategories: list[str],
) -> float:
    """Computes the recommendation score using the formula:

    S = (Wc * C_norm) + (Wr * (1 - e^(-λR))) + (Wb * B_norm) + (Wsub * Sub_norm)

    - C_norm:   normalized rating (calificacion / 5)
    - 1-e^(-λR): exponential smoothing over number of reviews — avoids
                 unfair advantage for workers with very high review counts
    - B_norm:   worker's total subcategories normalized by max possible badges
    - Sub_norm: proportion of requested subcategories the worker covers
    """
    lambda_ = weights["lambda"]

    c_norm   = worker["calificacion"] / norm["calificacion_max"]
    r_score  = 1 - math.exp(-lambda_ * worker["num_reviews"])
    b_norm   = min(len(worker["subcategorias"]) / norm["badges_max"], 1.0)

    if subcategories:
        worker_subs   = {s.lower() for s in worker["subcategorias"]}
        requested_subs = {s.lower() for s in subcategories}
        sub_norm = len(worker_subs & requested_subs) / len(requested_subs)
    else:
        sub_norm = 1.0

    return (
        weights["calificacion"]       * c_norm
        + weights["reviews_suavizados"] * r_score
        + weights["badges"]           * b_norm
        + weights["subcategoria"]     * sub_norm
    )


# --- Formatting ---

def _to_price_range(price_per_hour: int) -> str:
    """Converts an hourly rate to a $ symbol tier."""
    if price_per_hour < 150:
        return "$"
    if price_per_hour < 220:
        return "$$"
    if price_per_hour < 280:
        return "$$$"
    return "$$$$"


def _to_service_provider(worker: Raw_Worker) -> Service_Provider:
    """Maps a Worker entry to a typed Provider model."""
    return Service_Provider(
        id=worker["id"],
        name=worker["nombre"],
        category=worker["categoria"],
        rating=worker["calificacion"],
        badges=worker["subcategorias"],
        price_evaluation=_to_price_range(worker["precio_hora"]),
        available="Disponible ahora",
    )


# --- Public API ---
# region recommend function
def get_top_by_category_and_subs(
    category: str,
    subcategories: list[str] = [],
    limit: int = 10,
) -> list[Service_Provider]:
    """Returns the top-ranked available workers for a given service category.

    Args:
        categoria:     service category to filter by
        subcategories: keywords/subcategories from the user's problem description,
                       used to boost workers that specialize in those areas
        limit:         max number of results to return (default 10)
    """
    workers = load_workers()
    config  = load_config()
    norm: NormConfig = config["_normalizacion"]

    normalized_category = category.lower().strip()

    candidates = [
        w for w in workers
        if w["categoria"] == normalized_category and w["disponible"]
    ]

    ranked = sorted(
        candidates,
        key=lambda w: _calculate_score(w, config, norm, subcategories),
        reverse=True,
    )

    return [_to_service_provider(w) for w in ranked[:limit]]


def get_categories() -> list[str]:
    """Returns the list of valid service categories."""
    config = load_config()
    return config.get("_categorias_validas", [])
