from typing import TypedDict

NormConfig = TypedDict("NormConfig", {
    "calificacion_max": float,
    "precio_hora_min": int,
    "precio_hora_max": int,
    "experiencia_max": int,
    "trabajos_max": int,
    "reviews_max": int,
})