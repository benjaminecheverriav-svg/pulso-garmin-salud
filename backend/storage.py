"""Caché local en SQLite con las respuestas crudas de Garmin."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "garmin.db"


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "CREATE TABLE IF NOT EXISTS days (date TEXT PRIMARY KEY, raw TEXT NOT NULL, fetched_at TEXT NOT NULL)"
    )
    con.execute(
        "CREATE TABLE IF NOT EXISTS globals (key TEXT PRIMARY KEY, raw TEXT NOT NULL, fetched_at TEXT NOT NULL)"
    )
    con.execute(
        "CREATE TABLE IF NOT EXISTS activity_details (id TEXT PRIMARY KEY, raw TEXT NOT NULL, fetched_at TEXT NOT NULL)"
    )
    return con


def save_day(date: str, raw: dict[str, Any]) -> None:
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO days VALUES (?, ?, ?)",
            (date, json.dumps(raw), datetime.now().isoformat(timespec="seconds")),
        )


def has_day(date: str) -> bool:
    with _conn() as con:
        return con.execute("SELECT 1 FROM days WHERE date = ?", (date,)).fetchone() is not None


def load_days() -> dict[str, dict[str, Any]]:
    with _conn() as con:
        rows = con.execute("SELECT date, raw FROM days ORDER BY date").fetchall()
    return {d: json.loads(r) for d, r in rows}


def save_global(key: str, raw: Any) -> None:
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO globals VALUES (?, ?, ?)",
            (key, json.dumps(raw), datetime.now().isoformat(timespec="seconds")),
        )


def load_global(key: str) -> tuple[Any, str | None]:
    with _conn() as con:
        row = con.execute("SELECT raw, fetched_at FROM globals WHERE key = ?", (key,)).fetchone()
    return (json.loads(row[0]), row[1]) if row else (None, None)


def last_sync() -> str | None:
    with _conn() as con:
        row = con.execute("SELECT MAX(fetched_at) FROM days").fetchone()
    return row[0] if row else None


def save_activity_detail(activity_id: Any, raw: dict[str, Any]) -> None:
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO activity_details VALUES (?, ?, ?)",
            (str(activity_id), json.dumps(raw), datetime.now().isoformat(timespec="seconds")),
        )


def has_activity_detail(activity_id: Any) -> bool:
    with _conn() as con:
        return con.execute("SELECT 1 FROM activity_details WHERE id = ?", (str(activity_id),)).fetchone() is not None


def load_activity_details() -> dict[str, dict[str, Any]]:
    with _conn() as con:
        rows = con.execute("SELECT id, raw FROM activity_details").fetchall()
    return {i: json.loads(r) for i, r in rows}
