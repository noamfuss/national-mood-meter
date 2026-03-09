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

import re
import os
import json
import time
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

# ─── Status Labels ───────────────────────────────────────────────────────────
RSS_FEEDS = {
    "Ynet": "https://www.ynet.co.il/Integration/StoryRss2.xml",
    "Walla": "https://rss.walla.co.il/feed/22",
    "Haaretz": "https://www.haaretz.co.il/srv/rss---feedly",
    "Mako": "https://storage.googleapis.com/mako-sitemaps/rssHomepage.xml",
}

# ─── Keyword Stress Weights ──────────────────────────────────────────────────
STRESS_KEYWORDS: dict[str, int] = {
    # High panic
    "פיגוע": 25, "פיצוץ": 22, "ירי": 20, "טיל": 20, "רקטה": 20,
    "יירוטים": 20, "יירוט": 18, "אזעקה": 18, "סירנה": 18, "נפגע": 22,
    "הרוג": 30, "פצוע": 20, "חדירה": 22, "מתקפה": 25, "פלישה": 22,
    "חיזבאללה": 15, "חמאס": 12, "גיוס": 10, "כוננות": 15,
    "חירום": 20, "פינוי": 18, "מקלט": 15, "ממ\"ד": 12,
    "כטב\"מ": 15, "מל\"ט": 15, "נשק": 10, "לחימה": 20,
    # Moderate stress
    "מתיחות": 10, "עימות": 12, "תקרית": 8, "ניסיון": 8,
    "ביטחוני": 8, "דיון חשאי": 8,
    # Calm
    "חזרה לשגרה": -15, "שגרה": -10, "הסכם": -12, "שביתת נשק": -18,
    "שחרור חטופים": -20, "חטופים חזרו": -25, "הסדר": -12,
    "שלום": -10, "פתיחת בתי ספר": -10, "תיירות": -8,
    "נחיתה": -5, "שגרירות": -5, "דיפלומטיה": -8,
}

# ─── Status Labels ───────────────────────────────────────────────────────────
def get_status(score: int) -> str:
    if score <= 10:  return "תישן טוב הלילה 😴"
    if score <= 25:  return "לך לישון, הכל בסדר"
    if score <= 40:  return "אפשר לנשום. בנתיים."
    if score <= 55:  return "תכין את הקיט, אבל אל תפנה את הבית"
    if score <= 70:  return "אולי תמלא את המיכל?"
    if score <= 85:  return "קנה טונה עכשיו!!!"
    return "📦 הכל לממ\"ד. עכשיו."


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
        # Check if cache is reasonably fresh (e.g., within 15 mins) just as a safeguard
        if "saved_at" in cached and (time.time() - cached["saved_at"]) < 900:
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
