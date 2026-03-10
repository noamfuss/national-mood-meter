"""
The National Pulse (מצב הרוח הלאומי) — FastAPI Backend
=======================================================
Requirements:
    pip install -r requirements.txt

Run:
    uvicorn main:app --reload --port 8000

Environment variables (.env):
    GEMINI_API_KEY=your_key_here
"""

import os
import json
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="National Pulse API")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─── Configure Gemini ────────────────────────────────────────────────────────
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_KEY) if GEMINI_KEY else None

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


# ─── Core Logic ──────────────────────────────────────────────────────────────
# (Processing logic moved to worker.py)

# ─── Route ───────────────────────────────────────────────────────────────────
@app.get("/api/mood", response_model=MoodResponse)
async def get_mood():
    log_request()
    cached = load_cache()
    if cached:
        return MoodResponse(**{k: v for k, v in cached.items() if k != "saved_at"})

    # Emergency fallback or if cache is missing/stale
    return MoodResponse(
        score=30,
        status="הנתונים מתעדכנים... נסה שוב בעוד רגע",
        top_headlines=[],
        last_updated=datetime.now().isoformat(),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "llm": "gemini" if client else "keywords-only"}


if __name__ == "__main__":
    # print(fetch_headlines())  # warm up feeds
    # exit()
    
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
