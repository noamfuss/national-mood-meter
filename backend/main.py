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
import math
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from get_status import get_status
from check_alerts import get_recent_alerts, ZONE_WEIGHTS
from database import get_recent_scores, get_panic_by_time, get_stressful_source, get_variation, get_headline_count

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
CITIES_FILE = Path(__file__).parent / "cities_simplified.json"
ALERT_MINUTES = 10  # how far back to check for alerts when calculating panic boost

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

def load_cities() -> dict:
    try:
        if CITIES_FILE.exists():
            data = json.loads(CITIES_FILE.read_text(encoding="utf-8"))
            return data
    except Exception as e:
        print(f"[Cities read error] {e}")
    return {}

CITIES = load_cities()

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

class AlertItem(BaseModel):
    time: str
    zones: list[str]

class BoomAnalysisResponse(BaseModel):
    is_interception: bool
    message: str

class PanicByTimeItem(BaseModel):
    hour: int
    average_panic: float

class StressfulSourceItem(BaseModel):
    source: str
    avg_impact: float
    num_headlines: int

class SentimentVariationItem(BaseModel):
    sentiment_type: str
    count: int
    percentage: float
class StatisticsResponse(BaseModel):
    panic_by_time: list[PanicByTimeItem]
    most_stressful_source: StressfulSourceItem | None
    sentiment_variation: list[SentimentVariationItem]
    headline_count: int | None


# ─── Core Logic ──────────────────────────────────────────────────────────────
# (Processing logic moved to worker.py)


def get_all_zones(cities: list[str]) -> list[str]:
    """
    Given a list of city names, return a list of all associated zones.
    Uses the CITIES mapping loaded from cities_simplified.json.
    """
    return {CITIES.get(city.replace("''", "'"), "") for city in cities}


def calculate_panic_boost(alerts: list[dict]) -> int:
    """
    alerts: list of {'area': str, 'time': datetime}
    """
    if not alerts:
        return 0
    
    total_alert_impact = 0
    now = datetime.now()
    
    for alert in alerts:
        alert_time = datetime.fromisoformat(alert['time'])
        minutes_ago = (now - alert_time).total_seconds() / 60
        if minutes_ago > ALERT_MINUTES: continue
        
        zone = CITIES.get(alert['city'][0], [""])[0]  # get the first zone for the first city
        weight = ZONE_WEIGHTS.get(zone, 1)  # default weight of 1 for unknown areas
        
        # Calculate decay based on how recent the alert is (more recent = higher impact)
        decay = (ALERT_MINUTES - minutes_ago) / ALERT_MINUTES
        total_alert_impact += (weight * decay)

    # log(1 + x) * factor gives a nice increasing boost that tapers off as more alerts come in
    boost = math.log1p(total_alert_impact) * 5  # factor can be tuned based on desired sensitivity 
    return int(boost)


# ─── Route ───────────────────────────────────────────────────────────────────
@app.get("/api/mood", response_model=MoodResponse)
async def get_mood():
    log_request()
    cached = load_cache()
    if cached:
        alerts = get_recent_alerts(ALERT_MINUTES)
        score = cached.get("score", 0) + calculate_panic_boost(alerts)
        return MoodResponse(
            score=min(score, 100),  # cap at 100
            status=get_status(min(score, 100)),
            top_headlines=[HeadlineItem(**h) for h in cached.get("top_headlines", [])],
            last_updated=cached.get("last_updated", datetime.now().isoformat())
        )

    # Emergency fallback or if cache is missing/stale
    return MoodResponse(
        score=30,
        status="הנתונים מתעדכנים... נסה שוב בעוד רגע",
        top_headlines=[],
        last_updated=datetime.now().isoformat(),
    )

@app.get("/api/daily-scores", response_model=list[DailyScoreItem])
async def get_daily_scores():
    rows = get_recent_scores(hours=24)
    return [DailyScoreItem(
        timestamp=row[0],
        score=row[1],
        top_headline=row[2],
        impact=row[3]
    ) for row in rows]


@app.get("/api/alerts", response_model=AlertItem)
async def get_recent_alert_zones():
    recent_alerts = get_recent_alerts(ALERT_MINUTES)
    # Get all unique zones from recent alerts
    cities = []
    for alert in recent_alerts:
        cities.extend(alert.get("cities") or [alert.get("city")])
    zones = get_all_zones(cities)
    
    latest_alert_time = max([alert.get("time") for alert in recent_alerts], default=datetime.now().isoformat())

    return AlertItem(
        time=latest_alert_time,
        zones=list(zones)
    )


@app.get("/api/statistics", response_model=StatisticsResponse)
async def get_statistics():
    panic_by_time = get_panic_by_time() or []
    stressful_source = get_stressful_source()
    variation = get_variation() or []
    
    return StatisticsResponse(
        panic_by_time=[PanicByTimeItem(hour=int(row["hour_of_day"]), average_panic=row["avg_panic_score"]) for row in panic_by_time],
        most_stressful_source=StressfulSourceItem(**stressful_source) if stressful_source else None,
        sentiment_variation=[SentimentVariationItem(**item) for item in variation],
        headline_count=get_headline_count()
    )

@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    # print(fetch_headlines())  # warm up feeds
    # exit()
    
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
