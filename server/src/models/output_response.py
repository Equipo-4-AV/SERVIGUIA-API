from pydantic import BaseModel, Field

from src.models.service_provider import Service_Provider

class OutputResponse(BaseModel):
    providers : list[Service_Provider] = Field(..., description="Lista de 10 mejores proveedores que se ajustan a la necesidad del usuario")
