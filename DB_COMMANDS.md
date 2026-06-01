# Database Setup and Commands (SQLModel)

This document describes how the database is initialized, models are defined, seeded, and tested using SQLModel.

---

## Prerequisites

- Docker is running and the stack is up (`docker compose up` or `docker compose -f docker/compose.yaml --env-file .env watch`)
- You the`.env` file with DB credentials at the project root with `DATABASE_URL` set.

---

## SQLModel Schema Initialization

The database tables are declared directly as Python classes in:
- [db_models.py](file:///d:/VS%20Python/SERVIGUIA_API/server/src/data/db_models.py)

Tables are automatically created/initialized via the Python code itself using SQLAlchemy metadata:
```python
from sqlmodel import SQLModel
from src.data.database import engine

SQLModel.metadata.create_all(engine)
```

This initialization logic is wrapped inside the `init_db()` helper function inside [database.py](file:///d:/VS%20Python/SERVIGUIA_API/server/src/data/database.py).

---

## Common Setup and Test Commands

### 1. Seed the Database
To populate the database tables with categories and keywords from `pesos.json` and workers from `trabajadores.json`, run the seed script inside the server container:

```bash
docker compose -f docker/compose.yaml --env-file .env exec server python -m src.data.seed
```

This will:
1. Ensure the PostgreSQL connection works.
2. Initialize tables (`Category`, `Subcategory`, `Badge`, `Worker`, and relation links) in the database if they don't already exist.
3. Clean existing database entries.
4. Insert normalized categories, subcategories, badges, and workers.

### 2. Run the Database Test Script
To verify the database state and query model relationships, run the test script inside the server container:

```bash
docker compose -f docker/compose.yaml --env-file .env exec server python -m src.data.test_db
```

This will print the count of items in each table and query a sample worker to display their category, subcategories, and badges.

### 3. View Database Logs
If you want to view query logs or verify PostgreSQL container actions:

```bash
docker compose -f docker/compose.yaml logs -f db
```

### 4. Inspect Database Tables via psql
To quickly inspect the database tables directly inside the Postgres container without entering credentials manually:

```bash
docker compose -f docker/compose.yaml --env-file .env exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```

---

## Schema Relational Mapping
The JSON lists in raw data are normalized into a proper relational model:
* **Category**: Defined from valid categories in `pesos.json`.
* **Subcategory**: Defined from the mapping keywords in `pesos.json`, referenced to Category.
* **Badge**: List of unique badges.
* **Worker**: Standard attributes, referencing `Category` (One-to-Many).
* **WorkerSubcategoryLink**: Many-to-Many association table connecting workers to their subcategories.
* **WorkerBadgeLink**: Many-to-Many association table connecting workers to their badges.