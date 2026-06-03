import sys
import os
from pathlib import Path

# Allow imports from server/ (routes, services, utils, models)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Dummy key so the lifespan check doesn't abort startup in route tests
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")
# Fallback so database.py module-level engine doesn't crash on import when
# DATABASE_URL is not in the environment (e.g. local dev without Postgres).
# In CI, DATABASE_URL is already set and setdefault leaves it untouched.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine
from fastapi.testclient import TestClient

from src.app import app
from src.data.database import get_session


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    from src.data.db_models import (  # noqa: F401 — registers models in metadata
        Category, Subcategory, Badge, Worker,
        WorkerSubcategoryLink, WorkerBadgeLink,
        User, RefreshToken,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
