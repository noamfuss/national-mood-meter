import { motion, AnimatePresence } from "framer-motion";
import { Radio, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { getScoreLabel } from "@/lib/moodData";

interface StatusBarProps {
  score: number;
  status: string;
  lastUpdated: string;
  isSimulate: boolean;
  isLoading: boolean;
}

export default function StatusBar({ score, status, lastUpdated, isSimulate, isLoading }: StatusBarProps) {
  const { textClass, label, borderClass } = getScoreLabel(score);

  const isPanic = score >= 65;
  const isCalm = score < 35;

  return (
    <div className={`
      flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border
      bg-war-card/80 backdrop-blur-sm
      ${borderClass}
      transition-colors duration-1000
    `}>
      {/* Left: Live indicator + status */}
      <div className="flex items-center gap-3">
        {/* Live / Simulate badge */}
        <div className={`
          flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono-tech font-bold
          ${isSimulate
            ? "bg-score-neutral/15 text-score-neutral border border-score-neutral/30"
            : "bg-score-panic/15 text-score-panic border border-score-panic/30"
          }
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${isSimulate ? "bg-score-neutral animate-blink" : "bg-score-panic animate-blink"}`} />
          {isSimulate ? "SIMULATE" : "LIVE"}
        </div>

        {/* Alert icon */}
        {isPanic && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            <AlertTriangle size={16} className="text-score-panic" />
          </motion.div>
        )}
        {isCalm && <CheckCircle size={16} className="text-score-calm" />}

        {/* Status message */}
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={`text-sm font-semibold ${textClass}`}
          >
            {isLoading ? "מעדכן נתונים..." : status}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Right: Metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono-tech">
        <div className="flex items-center gap-1.5">
          <Radio size={12} className="opacity-60" />
          <span>מצב: <span className={`font-bold ${textClass}`}>{label}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="opacity-60" />
          <span>עדכניות נתונים: {new Date(lastUpdated).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}
