import os
from sqlmodel import create_engine, SQLModel, Session

# Get the database connection URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy requires 'postgresql://' instead of 'postgres://'
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create the engine
engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    """
    Import models to register them in SQLModel metadata and create the database tables.
    """
    from src.models.db_models import User, Time
    SQLModel.metadata.create_all(engine)

def get_session():
    """
    FastAPI dependency generator for database sessions.
    """
    with Session(engine) as session:
        yield session
