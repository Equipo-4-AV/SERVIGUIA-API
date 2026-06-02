import os
from sqlmodel import create_engine, SQLModel, Session

# Get the database connection URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

DATABASE_URL = os.getenv("DATABASE_URL")

connect_args = {}
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    parsed = urlparse(DATABASE_URL)
    query_params = parse_qs(parsed.query)
    
    # Remove 'schema' parameter so psycopg2 doesn't complain
    if "schema" in query_params:
        schema_name = query_params.pop("schema")[0]
        if schema_name and schema_name != "public":
            # Pass custom schema to postgres search_path
            connect_args["options"] = f"-c search_path={schema_name}"
            
    # Rebuild URL query string without schema
    new_query = urlencode(query_params, doseq=True)
    DATABASE_URL = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))

# Create the engine with custom options if any
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=True)

def init_db():
    """
    Import models to register them in SQLModel metadata and create the database tables.
    """
    from src.data.db_models import (
        Category, Subcategory, Badge, Worker,
        WorkerSubcategoryLink, WorkerBadgeLink,
        User, RefreshToken
    )
    SQLModel.metadata.create_all(engine)

def get_session():
    """
    FastAPI dependency generator for database sessions.
    """
    with Session(engine) as session:
        yield session
