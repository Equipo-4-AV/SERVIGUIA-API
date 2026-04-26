from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    context: str = Field(..., description="Texto del usuario a clasificar")
