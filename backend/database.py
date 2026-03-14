import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

DB_PATH = Path(__file__).parent / "mood_meter.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create daily_scores table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            score INTEGER NOT NULL,
            top_headline TEXT,
            impact INTEGER
        )
    ''')
    
    # Create headlines table with UNIQUE constraint
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS headlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            source TEXT,
            impact INTEGER,
            timestamp TEXT,
            is_llm BOOLEAN,
            UNIQUE(text, timestamp)
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_headlines_timestamp ON headlines(timestamp);
        CREATE INDEX IF NOT EXISTS idx_scores_timestamp ON daily_scores(timestamp);
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

def insert_daily_score(score: int, top_headline: str, impact: int):
    """Inserts a single mood score into the daily_scores table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO daily_scores (timestamp, score, top_headline, impact)
            VALUES (?, ?, ?, ?)
        ''', (datetime.now().isoformat(), score, top_headline, impact))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Error] insert_daily_score: {e}")

def insert_headlines(headlines: list[dict]):
    """Inserts a list of headlines into the headlines table, ignoring duplicates."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        for h in headlines:
            cursor.execute('''
                INSERT OR IGNORE INTO headlines (text, source, impact, timestamp, is_llm)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                h.get("text", "N/A"),
                h.get("source", "N/A"),
                h.get("impact", 0),
                h.get("datetime", h.get("timestamp", "")),
                int(bool(h.get("is_llm", False)))
            ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Error] insert_headlines: {e}")

def get_recent_scores(hours: int = 24):
    """Retrieves scores from the last X hours."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT timestamp, score, top_headline, impact 
            FROM daily_scores 
            WHERE timestamp > ?
            ORDER BY timestamp ASC
        ''', (cutoff,))
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        print(f"[DB Error] get_recent_scores: {e}")
        return []

if __name__ == "__main__":
    init_db()
