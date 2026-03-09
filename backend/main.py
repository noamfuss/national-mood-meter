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
import feedparser
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
CACHE_TTL = 10 * 60  # 10 minutes

def log_request() -> None:
    print(f"[{datetime.now().isoformat()}] Received request for /api/mood", flush=True)

def get_cache() -> dict | None:
    data = load_cache()
    if data and "saved_at" in data:
        age = time.time() - data["saved_at"]
        if age < CACHE_TTL:
            return data
    return {}

def load_cache() -> dict | None:
    try:
        if CACHE_FILE.exists():
            data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
            return data
    except Exception as e:
        print(f"[Cache read error] {e}")
    return {}


def save_cache(data: dict) -> None:
    try:
        data["saved_at"] = time.time()
        CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[Cache write error] {e}")

# ─── RSS Feeds ───────────────────────────────────────────────────────────────
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
def fetch_headlines() -> list[dict]:
    """Fetch headlines from all RSS feeds."""
    results = []
    for i, (feed_source, feed_url) in enumerate(RSS_FEEDS.items()):
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:  # top 10 per source
                title = entry.get("title", "").strip()
                if title:
                    results.append({"id": i, "text": title, "source": feed_source, "datetime": entry.get("published", "")})
        except Exception as e:
            print(f"[Feed error] {feed_url}: {e}")
    return results


def keyword_score(text: str) -> int:
    """Simple keyword-based impact score for a single headline."""
    total = 0
    text_lower = text.lower()
    for kw, weight in STRESS_KEYWORDS.items():
        if kw in text_lower or kw in text:
            total += weight
    return max(-30, min(30, total))  # clamp


def llm_score_headlines(headlines: list[dict]) -> list[dict]:
    """Use Gemini to score each headline. Fallback to keywords if unavailable."""
    if not client:
        for h in headlines:
            h["impact"] = keyword_score(h["text"])
        return headlines

    titles = "\n".join([f"{i+1}. {h['text']}" for i, h in enumerate(headlines)])
    cached_headlines = load_cache().get("top_headlines") or []
    history = "\n".join([f"{i+1}. {h['text']} (score: {h.get('impact', 'N/A')})" for i, h in enumerate(cached_headlines or [])])  #
    prompt = f"""
"אתה אנליסט מומחה לניתוח סנטימנט בטחוני בישראל. תפקידך לדרג כותרות חדשות לפי השפעתן על **'מדד הפאניקה הלאומי'**.

**סולם הדירוג (-10 עד +30):**
- **חיובי (0 עד מינוס 10):** הצלחות מבצעיות משמעותיות, חיסול בכירים, הצהרות הרגעה רשמיות של דו"צ, חזרה לשגרה מלאה, יירוטים מוצלחים של אירוע חריג. (זכור: במלחמה הנוכחית, תקיפה בטהרן נחשבת מרגיעה מאוד).
- **ניטרלי (0):** חדשות תרבות, ספורט, מזג אוויר, פטירות של אישים שאינן קשורות למלחמה (למשל: דמויות עבר, אמנים), ונושאים כלכליים שוטפים. **כל מה שלא משנה את רמת האיום הבטחוני הוא 0.**
- **שלילי (פלוס 1 עד פלוס 10):** שיבושי GPS, שמועות בטלגרם, דריכות גבוהה, שינויים קלים בהנחיות, הרוגים בודדים(1-2) מהצד הישראלי.
- **פאניקה (פלוס 11 עד פלוס 30):** מתקפה משולבת, ירי ללא הפסקה, אירוע רב נפגעים, נאומים של מנהיגי אויב עם איום מפורש, תקיפת תשתיות קריטיות (חשמל/מים).

**דירוגים קודמים (לצורך שמירה על קונסיסטנטיות):**
להלן כותרות שדורגו בעבר והציונים שניתנו להן. עליך לוודא שהדירוגים החדשים מתכתבים איתם בצורה לוגית:
{history}

**הנחיות קריטיות לקונסיסטנטיות:**
1. עיין ברשימת 'דירוגים קודמים'. אם כותרת חדשה דומה במהותה לכותרת מהעבר, עליה לקבל ציון זהה או קרוב מאוד.
2. שמור על "רמת רגישות" קבועה: אל תהיה מחמיר מדי פעם אחת ומקל מדי בפעם אחרת.
3. אם הכותרת היא ידיעת צבע, פנאי או ידיעה על פטירה של אדם בנסיבות טבעיות - הציון הוא **0**.
4. אם הידיעה "עצובה" אך לא "מפחידה", הציון הוא **0**.
5. נתח כל כותרת בקונטקסט של המלחמה הנוכחית מול איראן ושלוחותיה.

**כותרות חדשות לניתוח:**
{titles}

ענה בפורמט של רשימת מספרים מופרדים בפסיקים בלבד (לפי סדר הכותרות החדשות בלבד): 12,0,-5,22"
"""
    try:
        response = client.models.generate_content(model="gemini-3-flash-preview", contents=prompt)
        raw = response.text.strip()
        scores = [int(x.strip()) for x in re.findall(r"-?\d+", raw)]
        print(f"[LLM scores] {scores}")
        for i, h in enumerate(headlines):
            h["impact"] = max(-10, min(30, scores[i])) if i < len(scores) else keyword_score(h["text"])
    except Exception as e:
        print(f"[LLM error] {e} — falling back to keywords")
        for h in headlines:
            h["impact"] = keyword_score(h["text"])

    return headlines


def calculate_score(headlines: list[dict]) -> int:
    """Aggregate headline impacts into a 0-100 score."""
    if not headlines:
        return 30  # baseline
    total_impact = sum(h.get("impact", 0) for h in headlines)
    # Normalize: assume max raw impact range is -100 to +200
    normalized = (total_impact + 100) / 300 * 100
    return max(0, min(100, int(normalized)))


def deduplicate_headlines(headlines: list[dict]) -> list[dict]:
    """Remove near-duplicate headlines based on text similarity."""
    prompt = "אתה אלגוריתם מומחה לזיהוי כותרות חדשות דומות. קבל רשימת כותרות והחזר רק את הייחודיות ביותר, תוך הסרה של כותרות שנראות כמעט זהות או מתייחסות לאותו אירוע. הנה הכותרות:\n"
    for h in headlines:
        prompt += f"{h['id']}. {h['text']}\n"
    prompt += "\nהחזר את מספרי הכותרות הייחודיות בלבד, מופרדים על ידי פסיקים."
    try:
        response = client.models.generate_content(model="gemini-3.1-flash-lite-preview", contents=prompt)
        raw = response.text.strip()
        unique_ids = set(int(x.strip()) for x in re.findall(r"\d+", raw))
        print(f"[Deduplication] Keeping IDs: {unique_ids}")
        return [h for h in headlines if int(h["id"]) in unique_ids]
    except Exception as e:
        print(f"[Deduplication error] {e} — returning original list")
        return headlines

# ─── Route ───────────────────────────────────────────────────────────────────
@app.get("/api/mood", response_model=MoodResponse)
async def get_mood():
    log_request()
    cached = get_cache()
    if cached:
        return MoodResponse(**{k: v for k, v in cached.items() if k != "saved_at"})

    raw_headlines = fetch_headlines()
    raw_headlines = deduplicate_headlines(raw_headlines)

    if not raw_headlines:
        # Emergency fallback
        return MoodResponse(
            score=30,
            status="אין חיבור למקורות. בודק...",
            top_headlines=[],
            last_updated=datetime.now().isoformat(),
        )

    scored = llm_score_headlines(raw_headlines)

    # Sort by absolute impact, take top 20
    scored.sort(key=lambda h: abs(h.get("impact", 0)), reverse=True)
    top = scored[:20]

    total_score = calculate_score(scored)

    headlines_out = [
        HeadlineItem(
            id=str(i),
            text=h["text"],
            source=h["source"],
            impact=h.get("impact", 0),
            timestamp=h.get("datetime", ""),
        )
        for i, h in enumerate(top)
    ]

    result = MoodResponse(
        score=total_score,
        status=get_status(total_score),
        top_headlines=headlines_out,
        last_updated=datetime.now().isoformat(),
    )
    save_cache(result.model_dump())
    return result


@app.get("/health")
async def health():
    return {"status": "ok", "llm": "gemini" if client else "keywords-only"}


if __name__ == "__main__":
    # print(fetch_headlines())  # warm up feeds
    # exit()
    
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
