from enum import Enum

class Status(Enum):
    STARTING = "starting"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_CLARIFICATION = "requires_clarification"
    NOT_FOUND = "not_found"