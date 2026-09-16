"""Very small JSON-file history store."""
import json
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORY_FILE = os.path.join(BASE_DIR, "data", "history.json")


def _load():
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, encoding="utf-8") as f:
        return json.load(f)


def list_entries():
    return _load()


def add_entry(entry: dict):
    items = _load()
    entry = {**entry, "id": len(items) + 1, "timestamp": datetime.now().isoformat(timespec="seconds")}
    items.append(entry)
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    return entry


def clear():
    if os.path.exists(HISTORY_FILE):
        os.remove(HISTORY_FILE)
