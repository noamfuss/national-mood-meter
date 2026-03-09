
import re
import os
import json
import time
import feedparser
import asyncio
from datetime import datetime
from pathlib import Path
from google import genai
from dotenv import load_dotenv

load_dotenv()

# ─── Configure Gemini ────────────────────────────────────────────────────────
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_KEY) if GEMINI_KEY else None

# ─── Cache ───────────────────────────────────────────────────────────────────
CACHE_FILE = Path(__file__).parent / "mood_cache.json"
UPDATE_INTERVAL = 5 * 60  # 5 minutes


def load_cache() -> dict:
    try:
        if CACHE_FILE.exists():
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[Cache read error] {e}")
    return {}


def save_cache(data: dict) -> None:
    try:
        data["saved_at"] = time.time()
        CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[{datetime.now().isoformat()}] Cache updated successfully.", flush=True)
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
    "פיגוע": 25, "פיצוץ": 22, "ירי": 20, "טיל": 20, "רקטה": 20,
    "יירוטים": 20, "יירוט": 18, "אזעקה": 18, "סירנה": 18, "נפגע": 22,
    "הרוג": 30, "פצוע": 20, "חדירה": 22, "מתקפה": 25, "פלישה": 22,
    "חיזבאללה": 15, "חמאס": 12, "גיוס": 10, "כוננות": 15,
    "חירום": 20, "פינוי": 18, "מקלט": 15, "ממ\"ד": 12,
    "כטב\"מ": 15, "מל\"ט": 15, "נשק": 10, "לחימה": 20,
    "מתיחות": 10, "עימות": 12, "תקרית": 8, "ניסיון": 8,
    "ביטחוני": 8, "דיון חשאי": 8,
    "חזרה לשגרה": -15, "שגרה": -10, "הסכם": -12, "שביתת נשק": -18,
    "שחרור חטופים": -20, "חטופים חזרו": -25, "הסדר": -12,
    "שלום": -10, "פתיחת בתי ספר": -10, "תיירות": -8,
    "נחיתה": -5, "שגרירות": -5, "דיפלומטיה": -8,
}


def get_status(score: int) -> str:
    if score <= 10:  return "תישן טוב הלילה 😴"
    if score <= 25:  return "לך לישון, הכל בסדר"
    if score <= 40:  return "אפשר לנשום. בנתיים."
    if score <= 55:  return "תכין את הקיט, אבל אל תפנה את הבית"
    if score <= 70:  return "אולי תמלא את המיכל?"
    if score <= 85:  return "קנה טונה עכשיו!!!"
    return "📦 הכל לממ\"ד. עכשיו."


def fetch_headlines() -> list[dict]:
    results = []
    for i, (feed_source, feed_url) in enumerate(RSS_FEEDS.items()):
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:
                title = entry.get("title", "").strip()
                if title:
                    results.append({"id": f"{i}-{len(results)}", "text": title, "source": feed_source, "datetime": entry.get("published", "")})
        except Exception as e:
            print(f"[Feed error] {feed_url}: {e}")
    return results


def keyword_score(text: str) -> int:
    total = 0
    text_lower = text.lower()
    for kw, weight in STRESS_KEYWORDS.items():
        if kw in text_lower or kw in text:
            total += weight
    return max(-30, min(30, total))


def llm_score_headlines(headlines: list[dict]) -> list[dict]:
    if not client:
        for h in headlines:
            h["impact"] = keyword_score(h["text"])
        return headlines

    titles = "\n".join([f"{i+1}. {h['text']}" for i, h in enumerate(headlines)])
    cached_headlines = load_cache().get("top_headlines") or []
    history = "\n".join([f"{i+1}. {h['text']} (score: {h.get('impact', 'N/A')})" for i, h in enumerate(cached_headlines)])
    
    prompt = f"""
"אתה אנליסט מומחה לניתוח סנטימנט בטחוני בישראל. תפקידך לדרג כותרות חדשות לפי השפעתן על **'מדד הפאניקה הלאומי'**.

**סולם הדירוג (-10 עד +30):**
- **חיובי (0 עד מינוס 10):** הצלחות מבצעיות משמעותיות, חיסול בכירים, הצהרות הרגעה רשמיות של דו"צ, חזרה לשגרה מלאה, יירוטים מוצלחים של אירוע חריג. (זכור: במלחמה הנוכחית, תקיפה בטהרן נחשבת מרגיעה מאוד).
- **ניטרלי (0):** חדשות תרבות, ספורט, מזג אוויר, פטירות של אישים שאינן קשורות למלחמה (למשל: דמויות עבר, אמנים), ונושאים כלכליים שוטפים. **כל מה שלא משנה את רמת האיום הבטחוני הוא 0.**
- **שלילי (פלוס 1 עד פלוס 10):** שיבושי GPS, שמועות בטלגרם, דריכות גבוהה, שינויים קלים בהנחיות, הרוגים בודדים(1-2) מהצד הישראלי.
- **פאניקה (פלוס 11 עד פלוס 30):** מתקפה משולבת, ירי ללא הפסקה, אירוע רב נפגעים, נאומים של מנהיגי אויב עם איום מפורש, תקיפת תשתיות קריטיות (חשמל/מים).

**דירוגים קודמים:**
{history}

**הנחיות קריטיות:**
1. עיין ברשימת 'דירוגים קודמים'.
2. שמור על קונסיסטנטיות.
3. ידיעות צבע/פנאי/פטירה טבעית = 0.
4. "עצוב" אך לא "מפחיד" = 0.

**כותרות חדשות:**
{titles}

ענה בפורמט של רשימת מספרים מופרדים בפסיקים בלבד: 12,0,-5,22"
"""
    try:
        response = client.models.generate_content(model="gemini-3-flash-preview", contents=prompt)
        raw = response.text.strip()
        scores = [int(x.strip()) for x in re.findall(r"-?\d+", raw)]
        for i, h in enumerate(headlines):
            h["impact"] = max(-10, min(30, scores[i])) if i < len(scores) else keyword_score(h["text"])
    except Exception as e:
        print(f"[LLM error] {e} — falling back to keywords")
        for h in headlines:
            h["impact"] = keyword_score(h["text"])
    return headlines


def calculate_score(headlines: list[dict]) -> int:
    if not headlines:
        return 30
    total_impact = sum(h.get("impact", 0) for h in headlines)
    normalized = (total_impact + 100) / 300 * 100
    return max(0, min(100, int(normalized)))


def deduplicate_headlines(headlines: list[dict]) -> list[dict]:
    if not client or not headlines:
        return headlines

    prompt = "אתה אלגוריתם מומחה לזיהוי כותרות חדשות דומות. קבל רשימת כותרות והחזר רק את הייחודיות ביותר, תוך הסרה של כותרות שנראות כמעט זהות או מתייחסות לאותו אירוע. הנה הכותרות:\n"
    for i, h in enumerate(headlines):
        prompt += f"{i}. {h['text']}\n"
    prompt += "\nהחזר את מספרי הכותרות הייחודיות בלבד (למשל: 0, 2, 5), מופרדים על ידי פסיקים."
    
    try:
        response = client.models.generate_content(model="gemini-3.1-flash-lite-preview", contents=prompt)
        raw = response.text.strip()
        unique_indices = set(int(x.strip()) for x in re.findall(r"\d+", raw))
        return [h for i, h in enumerate(headlines) if i in unique_indices]
    except Exception as e:
        print(f"[Deduplication error] {e} — returning original list")
        return headlines


async def update_mood_data():
    print(f"[{datetime.now().isoformat()}] Starting mood update...", flush=True)
    raw_headlines = fetch_headlines()
    if not raw_headlines:
        print("No headlines fetched.")
        return

    unique_headlines = deduplicate_headlines(raw_headlines)
    scored_headlines = llm_score_headlines(unique_headlines)
    
    scored_headlines.sort(key=lambda h: abs(h.get("impact", 0)), reverse=True)
    top = scored_headlines[:20]
    total_score = calculate_score(scored_headlines)

    headlines_out = [
        {
            "id": str(i),
            "text": h["text"],
            "source": h["source"],
            "impact": h.get("impact", 0),
            "timestamp": h.get("datetime", ""),
        }
        for i, h in enumerate(top)
    ]

    result = {
        "score": total_score,
        "status": get_status(total_score),
        "top_headlines": headlines_out,
        "last_updated": datetime.now().isoformat(),
    }
    save_cache(result)


async def main():
    while True:
        try:
            await update_mood_data()
        except Exception as e:
            print(f"[Worker Error] {e}")
        await asyncio.sleep(UPDATE_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
