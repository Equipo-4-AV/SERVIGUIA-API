from pydantic import BaseModel, ConfigDict


class ClassificationResult(BaseModel):
    categoria: str = "desconocido"
    es_emergencia: bool = False
    mensaje_seguridad: str | None = None

    model_config = ConfigDict(extra="allow")
