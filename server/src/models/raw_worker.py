from typing import TypedDict

Raw_Worker = TypedDict("Raw_Worker", {
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