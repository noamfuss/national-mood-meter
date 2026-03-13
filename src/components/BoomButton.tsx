import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ShieldCheck } from "lucide-react";
import { BOOM_MESSAGES } from "@/lib/moodData";

const API_URL = import.meta.env.DEV ? "http://localhost:8000/api/alerts" : "/api/alerts";

interface BoomButtonProps {
  onPress: () => void;
}

export default function BoomButton({ onPress }: BoomButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [quote, setQuote] = useState("");
  const [isInterception, setIsInterception] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handlePress = async () => {
    if (cooldown) return;

    onPress();
    setIsActive(true);
    setCooldown(true);
    
    // Fetch from Backend /api/alerts to check for interceptions via zones
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        // data.zones is a list of regions/zones reporting alerts
        if (data.zones && data.zones.length > 0) {
          const zonesStr = data.zones.join(", ");
          setQuote(`הבום ששמעת עשוי להיות יירוט מוצלח! דווחו התראות ב-10 הדקות האחרונות באזור ${zonesStr}.`);
          setIsInterception(true);
        } else {
          // Fallback to random funny quote if no alerts
          const randomQuote = BOOM_MESSAGES[Math.floor(Math.random() * BOOM_MESSAGES.length)];
          setQuote(randomQuote);
          setIsInterception(false);
        }
      } else {
        throw new Error("Backend error");
      }
    } catch (err) {
      console.warn("Backend /api/alerts failed, falling back to local messages", err);
      // Fallback to random funny quote
      const randomQuote = BOOM_MESSAGES[Math.floor(Math.random() * BOOM_MESSAGES.length)];
      setQuote(randomQuote);
      setIsInterception(false);
    }

    setTimeout(() => {
      setIsActive(false);
      setIsInterception(false);
    }, 8000);
    setTimeout(() => setCooldown(false), 30000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* The Button */}
      <motion.button
        onClick={handlePress}
        disabled={cooldown}
        whileTap={!cooldown ? { scale: 0.93 } : {}}
        className={`
          relative w-full py-4 px-6 rounded-lg border-2 font-bold text-base
          flex items-center justify-center gap-3
          transition-all duration-300
          ${isActive
            ? "border-score-calm bg-score-calm/10 text-score-calm shadow-glow-calm"
            : cooldown
            ? "border-war-border/30 bg-muted/20 text-muted-foreground cursor-not-allowed"
            : "border-war-cyan/40 bg-war-card/80 text-war-cyan hover:border-war-cyan/70 hover:bg-war-cyan/5 hover:shadow-glow-calm"
          }
        `}
      >
        {/* Shimmer effect */}
        {!cooldown && !isActive && (
          <motion.div
            className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
            initial={false}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-war-cyan/5 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>
        )}

        <Volume2 size={20} className={isActive ? "text-score-calm" : ""} />
        <span>
          {isActive ? "מנתח פיצוץ..." : cooldown ? "נרגעים מהבום..." : "שמעתי בום"}
        </span>
        <span className="text-xs opacity-60 font-normal">[כפתור הרגעה]</span>
      </motion.button>

      {/* Quote overlay */}
      <AnimatePresence>
        {isActive && quote && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            className={`
              w-full p-4 rounded-lg border shadow-glow-calm transition-colors duration-500
              ${isInterception 
                ? "border-score-calm/60 bg-score-calm/10 ring-2 ring-score-calm/20" 
                : "border-score-calm/40 bg-score-calm/5" 
              }
            `}
          >
            <div className="flex gap-3 items-start">
              {/* Icon / Blinking dot */}
              <div className="mt-1 flex-shrink-0">
                {isInterception ? (
                  <ShieldCheck className="text-score-calm animate-pulse" size={18} />
                ) : (
                  <span className="flex w-2 h-2 rounded-full bg-score-calm animate-blink" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-score-calm/70 font-mono-tech mb-1 uppercase tracking-tighter">
                  {isInterception ? "// זיהוי יירוט פוטנציאלי" : "// ניתוח אקוסטי - דו״ח מצב"}
                </p>
                <p className={`text-sm leading-relaxed ${isInterception ? "font-bold text-foreground" : "text-foreground"}`}>
                  {quote}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2 font-mono-tech opacity-60">
                   {isInterception ? "— מקור: פיקוד העורף" : "— מערכת זיהוי בומים לאומית"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
