import json
import sqlite3
from pathlib import Path
from database import DB_PATH, init_db

def migrate_jsonl_to_sqlite():
    # Ensure DB is initialized
    init_db()
    
    daily_scores_dir = Path(__file__).parent / "daily_scores"
    if not daily_scores_dir.exists():
        print("No daily_scores directory found. Nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    jsonl_files = list(daily_scores_dir.glob("*.jsonl"))
    print(f"Found {len(jsonl_files)} JSONL files to migrate.")

    total_inserted = 0
    for file_path in jsonl_files:
        print(f"Migrating {file_path.name}...")
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    timestamp = data.get("timestamp")
                    score = data.get("score")
                    top_headline = data.get("top_headline", "N/A")
                    impact = data.get("impact", 0)
                    
                    if timestamp is not None and score is not None:
                        cursor.execute('''
                            INSERT INTO daily_scores (timestamp, score, top_headline, impact)
                            VALUES (?, ?, ?, ?)
                        ''', (timestamp, score, top_headline, impact))
                        total_inserted += 1
                except json.JSONDecodeError as e:
                    print(f"Error decoding line in {file_path.name}: {e}")
                except Exception as e:
                    print(f"Error inserting data from {file_path.name}: {e}")

    conn.commit()
    conn.close()
    print(f"Migration completed. Inserted {total_inserted} records into daily_scores.")

if __name__ == "__main__":
    migrate_jsonl_to_sqlite()
