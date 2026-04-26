from pydantic import BaseModel

class Service_Provider(BaseModel):
    id: str
    name: str
    category: str
    rating: float
    badges: list[str]
    price_evaluation: str
    available: str