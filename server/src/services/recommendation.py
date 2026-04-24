from src.utils.load import load_data

def _score(worker: dict, pesos: dict, norm: dict) -> float:
    precio_range = norm["precio_hora_max"] - norm["precio_hora_min"]

    calificacion  = worker["calificacion"] / norm["calificacion_max"]
    precio        = 1 - (worker["precio_hora"] - norm["precio_hora_min"]) / precio_range
    experiencia   = min(worker["experiencia_años"] / norm["experiencia_max"], 1.0)
    reviews       = min(worker["num_reviews"] / norm["reviews_max"], 1.0)
    completados   = min(worker["trabajos_completados"] / norm["trabajos_max"], 1.0)

    return (
        calificacion * pesos["calificacion"]
        + precio     * pesos["precio_hora"]
        + experiencia * pesos["experiencia_años"]
        + reviews    * pesos["num_reviews"]
        + completados * pesos["trabajos_completados"]
    )


def _rango_precio(precio_hora: int) -> str:
    if precio_hora < 150:
        return "$"
    if precio_hora < 220:
        return "$$"
    if precio_hora < 280:
        return "$$$"
    return "$$$$"


def get_top_by_category(categoria: str, limit: int = 10) -> list[dict]:
    workers, config = load_data()
    pesos = config
    norm  = config["_normalizacion"]

    categoria_norm = categoria.lower().strip()

    candidates = [
        w for w in workers
        if w["categoria"] == categoria_norm and w["disponible"]
    ]

    ranked = sorted(candidates, key=lambda w: _score(w, pesos, norm), reverse=True)

    return [
        {
            "id":            w["id"],
            "nombre":        w["nombre"],
            "categoria":     w["categoria"],
            "rating":        w["calificacion"],
            "badges":        w["subcategorias"],
            "rango_precio":  _rango_precio(w["precio_hora"]),
            "disponibilidad": "Disponible ahora",
        }
        for w in ranked[:limit]
    ]


def get_categories() -> list[str]:
    workers, config = load_data()
    return config.get("_categorias_validas", [])
