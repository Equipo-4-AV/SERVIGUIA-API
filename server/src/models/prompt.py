from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    task_id: str = Field(..., description="Identificador devuelto por POST /kickoff")
    context: str = Field(..., description="Texto del usuario a clasificar")
