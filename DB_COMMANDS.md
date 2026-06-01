# Database Container Setup

> **Context:** `prisma init` does not work in this project's setup. Instead, follow the steps below to manually create the Prisma schema and push it to the database.

---

## Prerequisites

- Docker is running and the stack is up (`docker compose up`)
- You have a `.env` file at the project root with `DATABASE_URL` set

---

## Steps that I did

### 1. Navigate to the server source directory

```bash
cd server/src
```

---

### 2. Create the `prisma` directory

```bash
mkdir -p prisma
```

---

### 3. Create `prisma/schema.prisma`

**Without entering the folder**, paste the following block directly into your terminal:

```bash
cat << 'EOF' > prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
generator client {
  provider             = "prisma-client-py"
  interface            = "asyncio"
  recursive_type_depth = 5
}
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
}
EOF
```

---

### 4. Verify the files were created

```bash
ls prisma
```

Expected output:

```
schema.prisma
```

---

### 5. Push the schema to the database

```bash
docker compose -f docker/compose.yaml --env-file .env exec server prisma db push
```

This applies the schema to the PostgreSQL database running inside the container. No migration files are generated — changes are pushed directly.

---

## Notes

- The generator uses [`prisma-client-py`](https://prisma-client-py.readthedocs.io/) with async support (`asyncio` interface).
- `recursive_type_depth = 5` is set to handle nested type generation for complex models.
- Re-run step 5 any time you update `schema.prisma` to sync changes to the database.