# Database Container Setup

> **Context:** `prisma init` does not work in this project's setup. The `prisma/` directory and `schema.prisma` have already been created manually — you only need to push the schema.

---

## Prerequisites

- Docker is running and the stack is up (`docker compose up`)
- You have a `.env` file at the project root with `DATABASE_URL` set

---

## Already done (do not repeat)

Steps 1–4 were completed during initial setup:

1. Navigated to `server/src`
2. Created the `prisma/` directory
3. Wrote `prisma/schema.prisma` manually via `cat` heredoc
4. Verified the file exists with `ls prisma`

---

## Your only step: push the schema

Run from the **project root**:

```bash
docker compose -f docker/compose.yaml --env-file .env exec server prisma db push
```

This applies the schema to the PostgreSQL database running inside the container. No migration files are generated — changes are pushed directly.

> **If the command fails with variable warnings**, make sure you're running it from the project root where `.env` is. If it still fails, the `--env-file` flag is already included above — double-check that `.env` exists at the root and contains `DATABASE_URL`.

---

## Note
- Re-run the push command any time you update `schema.prisma` to sync changes to the database.