import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
PROMPT_FILE = Path(__file__).parent.parent / "prompts" / "serviapi-v1.txt"


def load_workers() -> list[dict]:
    """Loads the list of service providers from trabajadores.json."""
    with open(DATA_DIR / "trabajadores.json", encoding="utf-8") as f:
        return json.load(f)


def load_config() -> dict:
    """Loads the scoring weights and configuration from pesos.json."""
    with open(DATA_DIR / "pesos.json", encoding="utf-8") as f:
        return json.load(f)


def load_prompt(filename: str | Path = PROMPT_FILE) -> str:
    try:
        with open(Path(filename), "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""