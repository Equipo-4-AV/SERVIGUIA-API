import json
from pathlib import Path
DATA_DIR = Path(__file__).parent.parent / "data"
PROMPT_FILE = Path(__file__).parent.parent / "prompts" / "serviapi-v1.txt"


def load_data() -> tuple[list[dict], dict]:
    with open(DATA_DIR / "trabajadores.json", encoding="utf-8") as f:
        workers = json.load(f)
    with open(DATA_DIR / "pesos.json", encoding="utf-8") as f:
        config = json.load(f)
    return workers, config

def load_prompt(filename: str | Path = PROMPT_FILE) -> str:
    try:
        with open(Path(filename), "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""