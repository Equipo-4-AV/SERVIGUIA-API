import sys
import os
from pathlib import Path

# Allow imports from server/ (routes, services, utils, models)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Dummy key so the lifespan check doesn't abort startup in route tests
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")
