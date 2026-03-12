"""
The National Pulse (מצב הרוח הלאומי) — FastAPI Backend
=======================================================
Requirements:
    pip install -r requirements.txt

Run:
    uvicorn main:app --reload --port 8000
"""

import json
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from get_status import get_status

app = FastAPI(title="National Pulse API")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─── Cache ───────────────────────────────────────────────────────────────────
CACHE_FILE = Path(__file__).parent / "mood_cache.json"

def log_request() -> None:
    print(f"[{datetime.now().isoformat()}] Received request for /api/mood", flush=True)

def load_cache() -> dict | None:
    try:
        if CACHE_FILE.exists():
            data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            return data
    except Exception as e:
        print(f"[Cache read error] {e}")
    return {}

# ─── Data Models ─────────────────────────────────────────────────────────────
class HeadlineItem(BaseModel):
    id: str
    text: str
    source: str
    impact: int
    timestamp: str

class MoodResponse(BaseModel):
    score: int
    status: str
    top_headlines: list[HeadlineItem]
    last_updated: str

class DailyScoreItem(BaseModel):
    timestamp: str
    score: int
    top_headline: str | None
    impact: int | None


# ─── Core Logic ──────────────────────────────────────────────────────────────
# (Processing logic moved to worker.py)

# ─── Route ───────────────────────────────────────────────────────────────────
@app.get("/api/mood", response_model=MoodResponse)
async def get_mood():
    log_request()
    cached = load_cache()
    if cached:
        return MoodResponse(
            score=cached.get("score", 0),
            status=get_status(cached.get("score", 0)),
            top_headlines=[HeadlineItem(**h) for h in cached.get("top_headlines", [])],
            last_updated=cached.get("last_updated", datetime.now().isoformat())
        )
        return MoodResponse(**{k: v for k, v in cached.items() if k != "saved_at"})

    # Emergency fallback or if cache is missing/stale
    return MoodResponse(
        score=30,
        status="הנתונים מתעדכנים... נסה שוב בעוד רגע",
        top_headlines=[],
        last_updated=datetime.now().isoformat(),
    )

@app.get("/api/daily-scores", response_model=list[DailyScoreItem])
async def get_daily_scores():

    filename = f"daily_scores/{datetime.now().date().isoformat()}.jsonl"
    if not Path(filename).exists():
        return []

    daily_scores = []
    with open(filename, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                daily_scores.append(DailyScoreItem(
                    timestamp=data.get("timestamp", ""),
                    score=data.get("score", 0),
                    top_headline=data.get("top_headline", None),
                    impact=data.get("impact", None)
                ))
            except json.JSONDecodeError:
                continue

    return daily_scores


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    # print(fetch_headlines())  # warm up feeds
    # exit()
    
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
