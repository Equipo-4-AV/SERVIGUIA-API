## 🛠️ Setup

> [!IMPORTANT]
> For Developers, after cloning run:

```bash
git config core.hooksPath .githooks
```

### Project Structure

- `server/`: FastAPI backend, Dockerfile, and requirements.
- `client/`: React frontend.
- `docker/`: Compose configuration.
- `.githooks/`: shared commit hooks for the whole repository.
- `.env`: centralized environment variables for `server` and `client`.

### How to Run?

Run the docker compose to build and setup everything related with the proyect.
Don't worry about hot-loading. Docker Compose uses watch to stablish a sync connection between the container and our code.

> [!WARNING]
> Make sure Docker Desktop is running

```bash
docker compose -f docker/compose.yaml --env-file .env watch
```

Create your env file once at project root:

```bash
cp .env.example .env
```

If you want to view container logs use the following command

```bash
docker compose -f docker/compose.yaml logs -f server
```

Client logs:

```bash
docker compose -f docker/compose.yaml logs -f client
```

### Seed the Database
To populate the database tables with categories and keywords from `pesos.json` and workers from `trabajadores.json`, run the seed script inside the server container:

```bash
docker compose -f docker/compose.yaml --env-file .env exec server python -m src.data.seed
```

### When schema changes (new tables, new columns), wipe the old DB volume
```bash
docker compose -f docker/compose.yaml down -v
```
#### Rebuild with new dependencies and code
```bash
docker compose -f docker/compose.yaml --env-file .env build server
```
Then you can run the container with the standard command

> [!TIP]
> `venv` is Python virtual environment, while `.env` is environment variables file.

## 📝 Commit Title Types


| **Type**   | **Description**                                                                       |
| ---------- | ------------------------------------------------------------------------------------- |
| `feat`     | Adds, adjusts, or removes a new **feature** in the project                            |
| `fix`      | Fixes a **bug** related to a previously added feature                                 |
| `refactor` | Changes that **rewrite or restructure code** without changing functionality           |
| `perf`     | Performance-focused changes that optimize code (a special type of `refactor`)         |
| `style`    | Changes related to **code style** (e.g., formatting, whitespace) with no logic impact |
| `test`     | Adds missing tests or fixes existing ones                                             |
| `docs`     | Updates or adds **documentation** only                                                |
| `build`    | Changes that affect the **build system**, dependencies, versioning, or CI/CD          |
| `ops`      | Changes related to **operations** like deployment, infrastructure, or scripts         |
| `chore`    | Miscellaneous tasks (e.g., updating `.gitignore`, non-functional maintenance)         |


> [!NOTE]
> Also accepts compound titles like feat&fix

