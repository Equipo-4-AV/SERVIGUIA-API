tasks_db: dict[str, dict] = {}


class InMemoryTaskStore:
    """Encapsula el dict compartido sin cambiar su forma."""

    __slots__ = ("_data",)

    def __init__(self, data: dict[str, dict]) -> None:
        self._data = data

    def create_placeholder(self, task_id: str) -> None:
        self._data[task_id] = {"status": "starting"}

    def mark_processing(self, task_id: str) -> None:
        self._data[task_id] = {"status": "processing"}

    def set_completed(self, task_id: str, result: dict) -> None:
        self._data[task_id] = {"status": "completed", "result": result}

    def set_failed(self, task_id: str, error: str) -> None:
        self._data[task_id] = {"status": "failed", "error": error}

    def has(self, task_id: str) -> bool:
        return task_id in self._data

    def get(self, task_id: str) -> dict:
        return self._data.get(task_id, {"status": "not_found"})


_default_store = InMemoryTaskStore(tasks_db)


def get_task_store() -> InMemoryTaskStore:
    return _default_store
