import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def load_workers() -> list[dict]:
    """Loads the list of service providers from trabajadores.json."""
    with open(DATA_DIR / "trabajadores.json", encoding="utf-8") as f:
        return json.load(f)


def load_config() -> dict:
    """Loads the scoring weights and configuration from pesos.json."""
    with open(DATA_DIR / "pesos.json", encoding="utf-8") as f:
        return json.load(f)


def load_prompt(filename="prompts/serviapi-v1.txt"):
    """Loads the system prompt from a text file. Returns 0 if not found."""
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return 0
