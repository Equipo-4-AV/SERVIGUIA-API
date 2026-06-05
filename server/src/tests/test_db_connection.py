from pathlib import Path

import pytest
from dotenv import load_dotenv
from sqlalchemy import func, text
from sqlmodel import Session, select

load_dotenv(Path(__file__).parents[3] / ".env")

from src.data.database import engine
from src.data.db_models import Badge, Category, Subcategory, Worker


@pytest.fixture
def db_session():
    with Session(engine) as session:
        yield session


def test_database_session_exists_and_can_query(db_session):
    result = db_session.exec(text("SELECT 1")).one()

    assert result[0] == 1


def test_database_has_seeded_core_tables(db_session):
    counts = {
        "categories": db_session.exec(select(func.count()).select_from(Category)).one(),
        "subcategories": db_session.exec(select(func.count()).select_from(Subcategory)).one(),
        "badges": db_session.exec(select(func.count()).select_from(Badge)).one(),
        "workers": db_session.exec(select(func.count()).select_from(Worker)).one(),
    }

    assert counts["categories"] > 0
    assert counts["subcategories"] > 0
    assert counts["badges"] > 0
    assert counts["workers"] > 0


def test_worker_can_load_database_relationships(db_session):
    worker = db_session.exec(select(Worker)).first()

    assert worker is not None
    assert worker.category is not None
    assert worker.category.name
    assert isinstance(worker.subcategories, list)
    assert isinstance(worker.badges, list)


def test_available_workers_query_returns_valid_workers(db_session):
    workers = db_session.exec(select(Worker).where(Worker.available == True)).all()

    assert workers
    assert all(worker.available is True for worker in workers)
    assert all(worker.category_id is not None for worker in workers)
