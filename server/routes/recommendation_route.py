from fastapi import APIRouter, HTTPException, Query
from services.recommendation import get_top_by_category, get_categories

router = APIRouter()


@router.get("/categorias")
def list_categories():
    return {"categorias": get_categories()}


@router.get("/recomendacion")
def recommend(
    categoria: str = Query(..., description="Categoría del servicio requerido"),
    limit: int = Query(10, ge=1, le=10),
):
    proveedores = get_top_by_category(categoria, limit)

    if not proveedores:
        raise HTTPException(
            status_code=404,
            detail=f"No hay proveedores disponibles para la categoría '{categoria}'",
        )

    return {
        "categoria": categoria,
        "total": len(proveedores),
        "proveedores": proveedores,
    }
