import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { HAGARI_QUOTES } from "@/lib/moodData";

export default function HagariButton() {
  const [isActive, setIsActive] = useState(false);
  const [quote, setQuote] = useState("");
  const [cooldown, setCooldown] = useState(false);

  const handlePress = () => {
    if (cooldown) return;

    const randomQuote = HAGARI_QUOTES[Math.floor(Math.random() * HAGARI_QUOTES.length)];
    setQuote(randomQuote);
    setIsActive(true);
    setCooldown(true);

    setTimeout(() => setIsActive(false), 5000);
    setTimeout(() => setCooldown(false), 6000);
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

        <Shield size={20} className={isActive ? "text-score-calm" : ""} />
        <span>
          {isActive ? "הגרי מדבר..." : cooldown ? "מעכל את ההרגעה..." : "לחץ להרגעה מיידית"}
        </span>
        <span className="text-xs opacity-60 font-normal">[כפתור הגרי]</span>
      </motion.button>

      {/* Quote overlay */}
      <AnimatePresence>
        {isActive && quote && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            className="w-full p-4 rounded-lg border border-score-calm/40 bg-score-calm/5 shadow-glow-calm"
          >
            <div className="flex gap-2 items-start">
              {/* Blinking dot */}
              <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-score-calm animate-blink" />
              <div>
                <p className="text-xs text-score-calm/70 font-mono-tech mb-1">// דובר צהל - הודעה רשמית</p>
                <p className="text-sm text-foreground leading-relaxed">"{quote}"</p>
                <p className="text-xs text-muted-foreground mt-2 font-mono-tech">— דניאל הגרי, דובר צה״ל</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
