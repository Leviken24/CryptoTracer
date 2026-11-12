"""
CryptoTrace AI - SQLite Database Layer (Built-in sqlite3)
Provides zero-dependency, tamper-safe persistence for forensic investigations.
"""

import json
import os
import sqlite3
import time
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "cryptotrace.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the SQLite tables."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS investigations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                blockchain TEXT DEFAULT 'bitcoin',
                input_type TEXT DEFAULT 'address',
                target TEXT NOT NULL,
                hops INTEGER DEFAULT 4,
                status TEXT DEFAULT 'completed',
                risk_score INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                result_json TEXT DEFAULT '{}',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_target ON investigations(target);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);")
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row, include_results: bool = True) -> Dict[str, Any]:
    item = {
        "id": row["id"],
        "case_id": row["case_id"],
        "title": row["title"],
        "blockchain": row["blockchain"],
        "input_type": row["input_type"],
        "target": row["target"],
        "hops": row["hops"],
        "status": row["status"],
        "risk_score": row["risk_score"],
        "notes": row["notes"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if include_results:
        raw_json = row["result_json"]
        try:
            item["results"] = json.loads(raw_json) if raw_json else {}
        except Exception:
            item["results"] = {}
    return item


def list_investigations(
    status: Optional[str] = None,
    blockchain: Optional[str] = None,
    query_str: Optional[str] = None,
) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        conditions = []
        params = []

        if status and status.lower() != "all":
            conditions.append("status = ?")
            params.append(status.lower())

        if blockchain and blockchain.lower() != "all":
            conditions.append("blockchain = ?")
            params.append(blockchain.lower())

        if query_str and query_str.strip():
            conditions.append("(title LIKE ? OR target LIKE ? OR case_id LIKE ?)")
            pattern = f"%{query_str.strip()}%"
            params.extend([pattern, pattern, pattern])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        sql = f"SELECT * FROM investigations {where_clause} ORDER BY created_at DESC"
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [row_to_dict(r, include_results=False) for r in rows]
    finally:
        conn.close()


def get_investigation_by_id(inv_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
        row = cursor.fetchone()
        return row_to_dict(row, include_results=True) if row else None
    finally:
        conn.close()


def insert_investigation(
    case_id: str,
    title: str,
    blockchain: str,
    input_type: str,
    target: str,
    hops: int,
    status: str,
    risk_score: int,
    notes: str,
    result_json: str,
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute(
            """
            INSERT INTO investigations (
                case_id, title, blockchain, input_type, target, hops, status,
                risk_score, notes, result_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (case_id, title, blockchain, input_type, target, hops, status, risk_score, notes, result_json, now, now),
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM investigations WHERE id = ?", (new_id,))
        row = cursor.fetchone()
        return row_to_dict(row, include_results=True)
    finally:
        conn.close()


def update_investigation_fields(
    inv_id: int,
    title: Optional[str] = None,
    notes: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
        existing = cursor.fetchone()
        if not existing:
            return None

        updates = []
        params = []
        now = int(time.time())

        if title is not None:
            updates.append("title = ?")
            params.append(title.strip())
        if notes is not None:
            updates.append("notes = ?")
            params.append(notes)
        if status is not None:
            updates.append("status = ?")
            params.append(status.lower())

        updates.append("updated_at = ?")
        params.append(now)
        params.append(inv_id)

        sql = f"UPDATE investigations SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, params)
        conn.commit()

        cursor.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
        return row_to_dict(cursor.fetchone(), include_results=False)
    finally:
        conn.close()


def delete_investigation_by_id(inv_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM investigations WHERE id = ?", (inv_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def count_investigations() -> int:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM investigations")
        return cursor.fetchone()[0]
    finally:
        conn.close()


# Initialize database schema immediately on import
init_db()
