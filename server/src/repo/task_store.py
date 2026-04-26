from src.services.recommendation_service import get_top_by_category_and_subs
from src.models.classification_result import ClassificationResult
from src.models.service_provider import Service_Provider

tasks_db: dict[str, dict] = {}

#TODO:
#- standerize status values in an enum
#? standerize dictionary indexes?
class InMemoryTaskStore:


    __slots__ = ("_data",)

    def __init__(self, data: dict[str, dict]) -> None:
        self._data = data

    def create_placeholder(self, task_id: str) -> None:
        self._data[task_id] = {
            "status": "starting",
            "history": [],
            "attempts": 0
        }

    def set_processing(self, task_id: str) -> None:
        if task_id in self._data:
            self._data[task_id]["status"] = "processing"

    def set_completed(self, task_id: str, result: dict) -> None:
        if task_id in self._data:
            self._data[task_id]["status"] = "completed"
            self._data[task_id]["result"] = result

    def set_failed(self, task_id: str, error: str) -> None:
        if task_id in self._data:
            self._data[task_id]["status"] = "failed"
            self._data[task_id]["error"] = error

    def set_requires_clarification(self, task_id: str, message: str, history: list, attempts: int) -> None:
        if task_id in self._data:
            self._data[task_id]["status"] = "requires_clarification"
            self._data[task_id]["message"] = message
            self._data[task_id]["history"] = history
            self._data[task_id]["attempts"] = attempts

    #! storing the providers recommended will prevent running the recommendation system everytime output is called
    # also, result atribute will not be affected in case it will always represent category and subcategories classification
    def set_providers(self, task_id: str):
        if task_id:
            classification = self._data[task_id]["result"] #classification is a dict using ClassificationResult aliases
            self._data[task_id]["providers"] = get_top_by_category_and_subs(
                category = classification["categoria"],
                subcategories = classification["subcategoria"]
                    )

    def has(self, task_id: str) -> bool:
        return task_id in self._data

    def get(self, task_id: str) -> dict:
        return self._data.get(task_id, {"status": "not_found"})


_default_store = InMemoryTaskStore(tasks_db)


def get_task_store() -> InMemoryTaskStore:
    return _default_store