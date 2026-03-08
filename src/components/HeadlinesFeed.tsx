import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import type { Headline } from "@/lib/moodData";

interface HeadlinesFeedProps {
  headlines: Headline[];
}

const formatRelativeTime = (timestamp: string) => {
  if (!timestamp) return "";
  try {
    const pubDate = new Date(timestamp);
    if (isNaN(pubDate.getTime())) return timestamp; // Fallback if not a valid date

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - pubDate.getTime()) / 1000);

    if (diffInSeconds < 60) return "עכשיו";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דק'`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `לפני ${diffInHours} שע'`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  } catch (e) {
    return timestamp;
  }
};

export default function HeadlinesFeed({ headlines }: HeadlinesFeedProps) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence>
        {headlines.map((headline, index) => {
          const isPositive = headline.impact > 0;
          const isNeutral = headline.impact === 0;
          const relativeTime = formatRelativeTime(headline.timestamp);

          return (
            <motion.div
              key={headline.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.07, duration: 0.4 }}
              className={`
                flex items-start gap-3 p-3 rounded border
                bg-war-card/60 backdrop-blur-sm
                ${isPositive
                  ? "border-score-panic/30 hover:border-score-panic/60"
                  : isNeutral
                  ? "border-war-border/30 hover:border-war-border/60"
                  : "border-score-calm/30 hover:border-score-calm/60"
                }
                transition-colors duration-200 group cursor-default
              `}
            >
              {/* Impact icon */}
              <div
                className={`
                  mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                  ${isPositive
                    ? "bg-score-panic/15 text-score-panic"
                    : isNeutral
                    ? "bg-war-border/20 text-muted-foreground"
                    : "bg-score-calm/15 text-score-calm"
                  }
                `}
              >
                {isPositive ? (
                  <TrendingUp size={14} />
                ) : isNeutral ? (
                  <Minus size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug font-medium">
                  {headline.text}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground font-mono-tech">{headline.source}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono-tech">
                    <Clock size={10} />
                    <span>{relativeTime}</span>
                  </div>
                </div>
              </div>

              {/* Impact badge */}
              <div
                className={`
                  flex-shrink-0 font-mono text-xs font-bold px-1.5 py-0.5 rounded
                  ${isPositive
                    ? "text-score-panic bg-score-panic/10"
                    : isNeutral
                    ? "text-muted-foreground bg-muted"
                    : "text-score-calm bg-score-calm/10"
                  }
                `}
              >
                {isPositive ? "+" : ""}{headline.impact}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
