import functools
import requests
from datetime import datetime, timedelta

ZONE_WEIGHTS = {
    'שרון': 1.4, 'מערב הנגב': 1.2, 'ים המלח': 1.1, 'דרום השפלה': 1.3, 
    'מרכז הנגב': 1.2, 'דרום הנגב': 1.2, 'חוף הכרמל': 1.2, 'גליל תחתון': 1.2, 
    'יערות הכרמל': 1.1, 'חיפה': 1.3, 'גולן': 1.2, 'עוטף עזה': 1, 'לכיש': 1.2, 
    'מערב לכיש': 1.2, 'ירושלים': 1.4, 'יהודה': 1.2, 'ירקון': 1.4, 'השפלה': 1.3, 
    'דן': 1.5, 'בקעה': 1.2, 'בקעת בית שאן': 1.3, 'תבור': 1.2, 'קריות': 1.3, 
    'חפר': 1.2, 'בית שמש': 1.3, 'ואדי ערה': 1.2, 'ערבה': 1.3, 'שומרון': 1.2, 
    'קצרין': 1.1, 'קו העימות': 1, 'גליל עליון': 1.2, 'מנשה': 1.2, 'אילת': 1.3
}


def cache(ttl=timedelta(hours=1)):
    def wrap(func):
        cache = {}
        @functools.wraps(func)
        def wrapped(*args, **kw):
            now = datetime.now()
            # see lru_cache for fancier alternatives
            key = tuple(args), frozenset(kw.items()) 
            if key not in cache or now - cache[key][0] > ttl:
                value = func(*args, **kw)
                cache[key] = (now, value)
            return cache[key][1]
        return wrapped
    return wrap


@cache(ttl=timedelta(seconds=10))
def get_recent_alerts(minutes=10):
    """
    Checks if there were any alerts in the past X minutes.
    Uses:
    1. https://api.tzevaadom.co.il/notifications
    2. https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json
    """
    
    ten_minutes_ago = datetime.now() - timedelta(minutes=minutes)
    alerts_found = []

    # 1. Try tzevaadom.co.il
    try:
        resp = requests.get("https://api.tzevaadom.co.il/notifications", timeout=5)
        if resp.ok:
            data = resp.json()
            for item in data:
                alert_time = datetime.fromtimestamp(item.get("time", 0))
                if alert_time > ten_minutes_ago:
                    alerts_found.append({
                        "source": "tzevaadom",
                        "time": alert_time.isoformat(),
                        "cities": item.get("cities", []),
                        "title": "ירי רקטות וטילים" if item.get("threat") == 5 else "האירוע הסתיים"
                    })
    except Exception as e:
        print(f"[Alert Check] Error fetching tzevaadom: {e}")

    # 2. Try Home Front Command History
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://www.oref.org.il/",
        "X-Requested-With": "XMLHttpRequest"
    }
    try:
        resp = requests.get("https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json", headers=headers, timeout=5)
        if resp.ok:
            data = resp.json()
            for item in data:
                try:
                    alert_time = datetime.strptime(item.get("alertDate", ""), "%Y-%m-%d %H:%M:%S")
                    if alert_time > ten_minutes_ago:  #  and item.get("title") in ["חדירת כלי טיס עוין", "ירי רקטות וטילים"]
                        alerts_found.append({
                            "source": "oref",
                            "time": alert_time.isoformat(),
                            "city": item.get("data"),
                            "title": item.get("title")
                        })
                except ValueError:
                    continue
    except Exception as e:
        print(f"[Alert Check] Error fetching oref history: {e}")

    return alerts_found
