// Mock data for Simulate Mode
export interface Headline {
  id: string;
  text: string;
  source: string;
  impact: number; // positive = raises stress, negative = lowers stress
  timestamp: string;
}

export interface MoodData {
  score: number; // 0-100 (0=total calm, 100=full panic)
  status: string;
  top_headlines: Headline[];
  last_updated: string;
}

export const SIMULATE_SCENARIOS: Record<string, MoodData> = {
  calm: {
    score: 18,
    status: "לך לישון, הכל בסדר",
    top_headlines: [
      { id: "1", text: "חזרה לשגרה בצפון: תושבים שבים לבתיהם", source: "ynet", impact: -15, timestamp: "לפני 10 דקות" },
      { id: "2", text: "הסכם שביתת הנשק מתקדם – פרטים מהמשא ומתן", source: "walla", impact: -12, timestamp: "לפני 25 דקות" },
      { id: "3", text: "חיילים חוזרים הביתה לחופשה לקראת החג", source: "mako", impact: -10, timestamp: "לפני 40 דקות" },
      { id: "4", text: "בית ספר בנגב פתח שעריו לראשונה מזה חצי שנה", source: "ynet", impact: -8, timestamp: "לפני שעה" },
      { id: "5", text: "שיגור טיל לעבר הדרום – יורט בהצלחה", source: "n12", impact: +3, timestamp: "לפני שעתיים" },
    ],
    last_updated: new Date().toISOString(),
  },
  moderate: {
    score: 52,
    status: "תכין את הקיט, אבל אל תפנה את הבית",
    top_headlines: [
      { id: "1", text: "סירנות בבאר שבע ואשקלון – תושבים במרחב מוגן", source: "ynet", impact: +18, timestamp: "לפני 5 דקות" },
      { id: "2", text: "ניסיון חדירה בגבול הצפון – כוחות בכוננות", source: "walla", impact: +15, timestamp: "לפני 15 דקות" },
      { id: "3", text: "ירי רקטות מרצועת עזה לעוטף", source: "mako", impact: +12, timestamp: "לפני 20 דקות" },
      { id: "4", text: "יירוטים מעל הנגב – מערכת כיפת ברזל פעילה", source: "n12", impact: +20, timestamp: "לפני 30 דקות" },
      { id: "5", text: "ראש הממשלה מכנס דיון ביטחוני בחשאי", source: "haaretz", impact: +8, timestamp: "לפני שעה" },
      { id: "6", text: "פינוי תושבים בקיבוצי עוטף עזה", source: "ynet", impact: +10, timestamp: "לפני שעה וחצי" },
    ],
    last_updated: new Date().toISOString(),
  },
  panic: {
    score: 87,
    status: "קנה טונה עכשיו!!!",
    top_headlines: [
      { id: "1", text: "מאות טילים שוגרו לעבר המרכז – ירושלים בכוננות מלאה", source: "ynet", impact: +25, timestamp: "לפני 2 דקות" },
      { id: "2", text: "פיצוץ חזק בתל אביב – חשש לפגיעה", source: "walla", impact: +30, timestamp: "לפני 3 דקות" },
      { id: "3", text: "הצהרת מצב חירום לאומי – מדינה בכוננות", source: "mako", impact: +28, timestamp: "לפני 8 דקות" },
      { id: "4", text: "נפגעים בפיגוע ירי בירושלים", source: "n12", impact: +22, timestamp: "לפני 12 דקות" },
      { id: "5", text: "מעורבות חיזבאללה – ירי מהצפון בו-זמנית", source: "haaretz", impact: +20, timestamp: "לפני 18 דקות" },
      { id: "6", text: "רמת הכוננות עלתה לדרגה ג׳ בכל הארץ", source: "ynet", impact: +15, timestamp: "לפני 25 דקות" },
      { id: "7", text: "חשד לחדירת כטב״מ לעומק השטח", source: "walla", impact: +18, timestamp: "לפני 35 דקות" },
    ],
    last_updated: new Date().toISOString(),
  },
};

export const HAGARI_QUOTES = [
  "אני פונה לציבור הישראלי: תישארו רגועים, אנחנו עוקבים אחר המצב.",
  "אין סיבה לפאניקה. כוחותינו ערוכים ומוכנים לכל תרחיש.",
  "הציבור מתבקש לפעול בהתאם להנחיות פיקוד העורף ולא להאמין לשמועות.",
  "מדינת ישראל חזקה ועמידה. אנחנו מתמודדים עם אתגרים גדולים יותר.",
  "שתו קפה, תנשמו, ותפסיקו לבדוק את הטלפון כל שנייה.",
  "ה-IDF בשליטה מלאה על המצב. ואם לא – תשתו עוד קפה.",
];

export function getScoreLabel(score: number): {
  color: string;
  glow: string;
  borderClass: string;
  textClass: string;
  label: string;
} {
  if (score < 35) {
    return {
      color: "hsl(150, 100%, 45%)",
      glow: "glow-calm",
      borderClass: "border-score-calm",
      textClass: "text-score-calm text-glow-calm",
      label: "רגוע",
    };
  } else if (score < 65) {
    return {
      color: "hsl(50, 100%, 55%)",
      glow: "glow-neutral",
      borderClass: "border-score-neutral",
      textClass: "text-score-neutral text-glow-neutral",
      label: "מתוח",
    };
  } else {
    return {
      color: "hsl(0, 100%, 55%)",
      glow: "glow-panic",
      borderClass: "border-score-panic",
      textClass: "text-score-panic text-glow-panic",
      label: "פאניקה",
    };
  }
}
