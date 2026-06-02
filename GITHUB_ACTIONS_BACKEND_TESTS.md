# GitHub Actions: Backend Tests

Este documento explica el workflow `.github/workflows/backend-tests.yml`, que ejecuta las pruebas del backend automaticamente en GitHub Actions.

## Por que el YAML va en `.github/workflows/`

GitHub Actions solo detecta workflows si estan dentro de esta carpeta:

```text
.github/workflows/
```

Cada archivo `.yml` o `.yaml` dentro de esa carpeta se registra como un workflow independiente.

En este caso, el archivo es:

```text
.github/workflows/backend-tests.yml
```

## Nombre del workflow

```yaml
name: Backend tests
```

Este nombre es el que aparece en la pestaña `Actions` de GitHub.

Tambien aparece como check cuando se abre un pull request.

## Triggers

```yaml
on:
  push:
    branches:
      - "**"
  pull_request:
    branches:
      - "**"
  workflow_dispatch:
```

Esta seccion define cuando se ejecuta el workflow.

`push` hace que el workflow corra cuando alguien sube commits.

`branches: "**"` significa que corre en cualquier rama.

`pull_request` hace que el workflow corra cuando se crea o actualiza un pull request.

`workflow_dispatch` permite correr el workflow manualmente desde GitHub web con el boton `Run workflow`.

## Permisos

```yaml
permissions:
  contents: read
```

El workflow solo necesita leer el codigo del repositorio.

No necesita permisos para escribir archivos, crear releases o modificar ramas.

## Job principal

```yaml
jobs:
  backend-tests:
    runs-on: ubuntu-latest
```

Un job es una unidad de trabajo dentro de GitHub Actions.

`backend-tests` es el nombre interno del job.

`runs-on: ubuntu-latest` indica que GitHub usara una maquina Linux temporal para ejecutar los pasos.

## Servicio temporal de Postgres

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: serviguia_test
    ports:
      - 5432:5432
```

Esta parte levanta un contenedor temporal de PostgreSQL dentro del workflow.

La DB solo existe mientras corre el job. Cuando el job termina, GitHub la destruye.

Esto permite probar la conexion real entre el backend y Postgres sin usar la DB local de Docker ni una DB de produccion.

## Health check de Postgres

```yaml
options: >-
  --health-cmd "pg_isready -U postgres -d serviguia_test"
  --health-interval 10s
  --health-timeout 5s
  --health-retries 5
```

Este bloque le dice a GitHub Actions como saber si Postgres ya esta listo.

`pg_isready` revisa que la DB acepte conexiones.

Sin este health check, los tests podrian empezar antes de que Postgres termine de arrancar.

## Variables de ambiente

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/serviguia_test
  OPENAI_API_KEY: sk-test-dummy
  PARTNER_SERVICE: test-partner
  CLIENT_APP: test-client
```

Estas variables reemplazan el `.env` local durante el CI.

No se sube `.env` a GitHub porque puede contener credenciales reales.

Para estas pruebas no hacen falta secretos reales:

- `DATABASE_URL` apunta al Postgres temporal del workflow.
- `OPENAI_API_KEY` usa un valor dummy para evitar errores de startup en tests.
- `PARTNER_SERVICE` y `CLIENT_APP` usan valores de prueba.

## Checkout del repositorio

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```

Este paso descarga el codigo del repositorio dentro del runner de GitHub.

Sin este paso, el workflow no tendria acceso a `server/`, `requirements.txt` ni los tests.

## Setup de Python

```yaml
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: "3.11"
```

Este paso instala Python 3.11 en el runner.

Se usa Python 3.11 porque es una version estable y compatible con las dependencias actuales del backend.

## Instalacion de dependencias

```yaml
- name: Install backend dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r server/requirements.txt
```

Primero se actualiza `pip`.

Luego se instalan las dependencias del backend desde:

```text
server/requirements.txt
```

Entre esas dependencias estan `pytest`, `sqlmodel`, `python-dotenv` y `psycopg2-binary`.

## Seed de la base de datos

```yaml
- name: Seed test database
  working-directory: server
  run: python -m src.data.seed
```

Antes de correr los tests, el workflow siembra la DB temporal.

Este comando:

1. Crea las tablas con `init_db()`.
2. Limpia datos anteriores si existieran.
3. Carga categorias, subcategorias, badges y workers desde los JSON del proyecto.

Esto es necesario porque `test_db_connection.py` valida que las tablas tengan datos.

## Ejecucion de tests

```yaml
- name: Run backend tests
  working-directory: server
  run: pytest src/tests -q
```

Este paso corre todos los tests dentro de:

```text
server/src/tests
```

Pytest detecta automaticamente archivos con nombre como:

```text
test_*.py
```

La opcion `-q` significa `quiet`, para mostrar una salida mas compacta.

## Como verlo en GitHub web

Despues de subir el archivo YAML al repositorio:

1. Entra al repositorio en GitHub.
2. Abre la pestana `Actions`.
3. Busca el workflow `Backend tests`.
4. Abre una ejecucion para ver los logs.

Para ejecutarlo manualmente:

1. Entra a `Actions`.
2. Selecciona `Backend tests`.
3. Presiona `Run workflow`.
4. Escoge la rama.
5. Presiona el boton verde `Run workflow`.

Si GitHub muestra los workflows deshabilitados, entra a `Actions` y usa `Enable workflows`.

## Como probar localmente

Desde la raiz del repo, con Docker corriendo:

```bash
docker compose -f docker/compose.yaml --env-file .env exec -T server pytest src/tests -q
```

Si la base local no tiene datos, corre primero:

```bash
docker compose -f docker/compose.yaml --env-file .env exec server python -m src.data.seed
```

## Resumen

Este workflow valida automaticamente que:

1. Las dependencias del backend se instalan correctamente.
2. PostgreSQL puede levantarse para pruebas.
3. La base de datos puede sembrarse.
4. Todos los tests de `server/src/tests` pasan en GitHub Actions.
