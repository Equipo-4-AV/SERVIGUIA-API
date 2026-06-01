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
### Run Unit Tests
Run the command in a different terminal while the container is running:
```bash
docker exec -it <your-server-docker-container-id>  pytest
```

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

