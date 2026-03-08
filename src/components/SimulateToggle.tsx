import { motion } from "framer-motion";
import { ToggleLeft, ToggleRight, Zap, Database, WifiOff } from "lucide-react";

interface SimulateToggleProps {
  isSimulate: boolean;
  isFallback: boolean;
  onToggle: (val: boolean) => void;
  scenario: "calm" | "moderate" | "panic";
  onScenarioChange: (s: "calm" | "moderate" | "panic") => void;
}

const SCENARIOS = [
  { key: "calm", label: "שלווה", color: "text-score-calm border-score-calm/40 bg-score-calm/10 hover:bg-score-calm/20" },
  { key: "moderate", label: "מתח", color: "text-score-neutral border-score-neutral/40 bg-score-neutral/10 hover:bg-score-neutral/20" },
  { key: "panic", label: "פאניקה", color: "text-score-panic border-score-panic/40 bg-score-panic/10 hover:bg-score-panic/20" },
] as const;

export default function SimulateToggle({ isSimulate, isFallback, onToggle, scenario, onScenarioChange }: SimulateToggleProps) {
  const showSimControls = isSimulate || isFallback;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-lg border bg-war-card/50 transition-colors duration-500
      ${isFallback ? "border-score-panic/40" : isSimulate ? "border-score-neutral/40" : "border-war-border"}
    `}>
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isFallback
            ? <WifiOff size={14} className="text-score-panic" />
            : isSimulate
              ? <Zap size={14} className="text-score-neutral" />
              : <Database size={14} className="text-score-calm" />
          }
          <span className={`text-xs font-mono-tech ${isFallback ? "text-score-panic" : isSimulate ? "text-score-neutral" : "text-score-calm"}`}>
            {isFallback ? "אין חיבור — נתוני ברירת מחדל" : isSimulate ? "מצב סימולציה" : "מחובר ל-API"}
          </span>
        </div>
        <button
          onClick={() => onToggle(!isSimulate)}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="text-xs text-muted-foreground">{isSimulate ? "סימולציה" : "חי"}</span>
          {isSimulate ? (
            <ToggleRight size={24} className="text-score-neutral" />
          ) : (
            <ToggleLeft size={24} className="text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Scenario selector (only in simulate/fallback mode) */}
      {showSimControls && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex gap-2"
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => onScenarioChange(s.key)}
              className={`
                flex-1 py-1.5 text-xs font-bold rounded border transition-all duration-200
                ${s.color}
                ${scenario === s.key ? "opacity-100 shadow-sm scale-105" : "opacity-50"}
              `}
            >
              {s.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
