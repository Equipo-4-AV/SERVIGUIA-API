from pydantic import BaseModel, ConfigDict


from pydantic import BaseModel, ConfigDict, Field

class ClassificationResult(BaseModel):
    category: str = Field(default="unknown", alias="categoria")
    subcategories: list[str] = Field(default=["unknown"], alias="subcategorias")
    is_emergency: bool = Field(default=False, alias="es_emergencia")
    safety_message: str | None = Field(default=None, alias="safety_message")  # Variable interna, no viene del LLM
    model_config = ConfigDict(extra="allow", populate_by_name=True)