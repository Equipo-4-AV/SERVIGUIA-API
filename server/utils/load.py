import json
from pathlib import Path
DATA_DIR = Path(__file__).parent.parent / "data"


def load_data() -> tuple[list[dict], dict]:
    with open(DATA_DIR / "trabajadores.json", encoding="utf-8") as f:
        workers = json.load(f)
    with open(DATA_DIR / "pesos.json", encoding="utf-8") as f:
        config = json.load(f)
    return workers, config

def load_prompt(filename="prompts/serviapi-v1.txt"):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return 0