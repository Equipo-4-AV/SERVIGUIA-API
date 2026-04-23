from typing import TypedDict

from pydantic import BaseModel

from utils.load import load_data


# --- Models ---

Worker = TypedDict("Worker", {
    "id": str,
    "nombre": str,
    "categoria": str,
    "subcategorias": list[str],
    "calificacion": float,
    "num_reviews": int,
    "precio_hora": int,
    "disponible": bool,
    "experiencia_años": int,
    "trabajos_completados": int,
    "zona": str,
    "telefono": str,
})

NormConfig = TypedDict("NormConfig", {
    "calificacion_max": float,
    "precio_hora_min": int,
    "precio_hora_max": int,
    "experiencia_max": int,
    "trabajos_max": int,
    "reviews_max": int,
})


class Provider(BaseModel):
    id: str
    nombre: str
    categoria: str
    rating: float
    badges: list[str]
    rango_precio: str
    disponibilidad: str


# --- Scoring ---

def _calculate_score(worker: Worker, weights: dict, norm: NormConfig) -> float:
    """Computes a normalized weighted score for a worker.

    Each field is scaled to [0, 1] before applying its weight.
    Price is inverted so lower cost yields a higher score.
    """
    price_range = norm["precio_hora_max"] - norm["precio_hora_min"]

    rating_score     = worker["calificacion"] / norm["calificacion_max"]
    price_score      = 1 - (worker["precio_hora"] - norm["precio_hora_min"]) / price_range
    experience_score = min(worker["experiencia_años"] / norm["experiencia_max"], 1.0)
    reviews_score    = min(worker["num_reviews"] / norm["reviews_max"], 1.0)
    completed_score  = min(worker["trabajos_completados"] / norm["trabajos_max"], 1.0)

    return (
        rating_score       * weights["calificacion"]
        + price_score      * weights["precio_hora"]
        + experience_score * weights["experiencia_años"]
        + reviews_score    * weights["num_reviews"]
        + completed_score  * weights["trabajos_completados"]
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


def _to_provider(worker: Worker) -> Provider:
    """Maps a Worker entry to a typed Provider model."""
    return Provider(
        id=worker["id"],
        nombre=worker["nombre"],
        categoria=worker["categoria"],
        rating=worker["calificacion"],
        badges=worker["subcategorias"],
        rango_precio=_to_price_range(worker["precio_hora"]),
        disponibilidad="Disponible ahora",
    )


# --- Public API ---

def get_top_by_category(categoria: str, limit: int = 10) -> list[Provider]:
    """Returns the top-ranked available workers for a given service category.

    Filters by category and availability, scores each candidate using a
    weighted formula, and returns up to `limit` results sorted descending.
    """
    workers, config = load_data()
    norm: NormConfig = config["_normalizacion"]

    normalized_category = categoria.lower().strip()

    candidates = [
        w for w in workers
        if w["categoria"] == normalized_category and w["disponible"]
    ]

    ranked = sorted(
        candidates,
        key=lambda w: _calculate_score(w, config, norm),
        reverse=True,
    )

    return [_to_provider(w) for w in ranked[:limit]]


def get_categories() -> list[str]:
    """Returns the list of valid service categories."""
    _, config = load_data()
    return config.get("_categorias_validas", [])
