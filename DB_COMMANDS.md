# Database Setup and Commands (SQLModel)

This document describes how the database is initialized, models are defined, and tests are run using SQLModel.

---

## Prerequisites

- Docker is running and the stack is up (`docker compose up` or `docker compose -f docker/compose.yaml --env-file .env watch`)
- You have a `.env` file at the project root with `DATABASE_URL` set.

---

## SQLModel Schema Initialization

Unlike Prisma, SQLModel does not require compiling a schema file or running code generation commands. The database tables are declared directly as Python classes in:
- [db_models.py](file:///d:/VS%20Python/SERVIGUIA_API/server/src/models/db_models.py)

Tables are automatically created/initialized via the Python code itself using SQLAlchemy metadata:
```python
from sqlmodel import SQLModel
from src.data.database import engine

SQLModel.metadata.create_all(engine)
```

This initialization logic is wrapped inside the `init_db()` helper function inside [database.py](file:///d:/VS%20Python/SERVIGUIA_API/server/src/data/database.py).

---

## Common Setup and Test Commands

### 1. Run the Database Test Script
To verify connection and ensure that database tables are initialized and populated with sample data, run the test script inside the server container:

```bash
docker compose -f docker/compose.yaml --env-file .env exec server python -m src.data.test_db
```

This will:
1. Ensure the PostgreSQL connection works.
2. Initialize tables (`User` and `Time`) in the database if they don't already exist.
3. Perform a clean insert of sample `User` and `Time` rows.

### 2. View Database Logs
If you want to view query logs or verify PostgreSQL container actions:

```bash
docker compose -f docker/compose.yaml logs -f db
```

---

## Notes
- Database models map directly to table names matching the casing of the previous Prisma tables (`User` and `Time`).
- Default values for creation timestamps are handled database-side using SQLAlchemy's `server_default=sa.func.now()`.
- Future schema migrations can be managed using standard SQLAlchemy migration tools like **Alembic**, or through re-running `init_db()` if doing rapid prototyping in development.