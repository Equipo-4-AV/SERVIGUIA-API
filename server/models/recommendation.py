from typing import TypedDict

from pydantic import BaseModel


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
