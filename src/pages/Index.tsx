import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bomb, Coffee, Ghost, RefreshCw, Activity, Newspaper, Info } from "lucide-react";
import { Link } from "react-router-dom";
import MoodGauge from "@/components/MoodGauge";
import HeadlinesFeed from "@/components/HeadlinesFeed";
import BoomButton from "@/components/BoomButton";
import StatusBar from "@/components/StatusBar";
import SimulateToggle from "@/components/SimulateToggle";
import DailyChart from "@/components/DailyChart";
import { SIMULATE_SCENARIOS, getScoreLabel, type MoodData } from "@/lib/moodData";

const API_URL = import.meta.env.DEV ? "http://localhost:8000/api/mood" : "/api/mood";
const REFRESH_INTERVAL = 5 * 60_000; // 5 minutes

export default function Index() {
  const [isSimulate, setIsSimulate] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [scenario, setScenario] = useState<"calm" | "moderate" | "panic">("moderate");
  const [data, setData] = useState<MoodData>(SIMULATE_SCENARIOS.moderate);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [scoreOffset, setScoreOffset] = useState(0);

  const fetchData = useCallback(async () => {
    if (isSimulate) {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      setData({ ...SIMULATE_SCENARIOS[scenario], last_updated: new Date().toISOString() });
      setError(null);
      setIsLoading(false);
      setLastRefresh(new Date());
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MoodData = await res.json();
      setData(json);
      setIsFallback(false);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      // Auto-fallback to static data — no manual simulate needed
      setIsFallback(true);
      setData({ ...SIMULATE_SCENARIOS[scenario], last_updated: new Date().toISOString() });
      setError("לא ניתן להתחבר ל-API. מציג נתוני ברירת מחדל.");
      setLastRefresh(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [isSimulate, scenario]);

  // Fetch on mount and when deps change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh (always active; when live it retries the backend, when fallback it keeps data fresh)
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleBoomPress = () => {
    setScoreOffset(-15);
    setTimeout(() => setScoreOffset(0), 60000);
  };

  const currentScore = Math.max(0, data.score + scoreOffset);
  const { textClass, borderClass } = getScoreLabel(currentScore);
  const isPanic = currentScore >= 65;

  return (
    <div
      dir="rtl"
      className={`
        min-h-screen bg-background grid-bg relative overflow-x-hidden
        transition-all duration-1000
      `}
    >
      {/* Scanline overlay */}
      <div className="fixed inset-0 scanline pointer-events-none z-0 opacity-40" />

      {/* Panic pulse effect */}
      <AnimatePresence>
        {isPanic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.04, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="fixed inset-0 bg-score-panic pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className={`w-10 h-10 rounded-lg border-2 ${borderClass} flex items-center justify-center ${isPanic ? "animate-flicker" : ""}`}>
              <Activity size={20} className={textClass} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">
                <span className={textClass}>מצב הרוח</span>{" "}
                <span className="text-foreground">הלאומי</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono-tech tracking-widest mt-0.5">
                THE NATIONAL PULSE // v2.0
              </p>
            </div>
          </div>

          {/* Right header icons */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-muted-foreground text-xs font-mono-tech">
              <span className="flex items-center gap-1">
                <Shield size={13} className="text-score-calm" /> הגנה
              </span>
              <span className="flex items-center gap-1">
                <Bomb size={13} className="text-score-panic" /> איום
              </span>
              <span className="flex items-center gap-1">
                <Coffee size={13} className="text-score-neutral" /> שקט
              </span>
              <span className="flex items-center gap-1">
                <Ghost size={13} className="text-muted-foreground" /> כלום
              </span>
            </div>

            {/* Refresh button */}
            <div className="flex items-center gap-2">
              <Link
                to="/about"
                className={`
                  w-9 h-9 rounded-lg border ${borderClass} flex items-center justify-center
                  text-muted-foreground hover:text-foreground
                  transition-all duration-200 hover:border-current
                `}
                title="אודות"
              >
                <Info size={15} />
              </Link>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className={`
                  w-9 h-9 rounded-lg border ${borderClass} flex items-center justify-center
                  text-muted-foreground hover:text-foreground
                  transition-all duration-200 hover:border-current
                  disabled:opacity-40
                `}
              >
                <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </motion.header>

        {/* ── Status Bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <StatusBar
            score={currentScore}
            status={data.status}
            lastUpdated={data.last_updated}
            isSimulate={isFallback}
            isLoading={isLoading}
          />
        </motion.div>

        {/* ── Error Banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2.5 rounded-lg border border-score-panic/40 bg-score-panic/10 text-score-panic text-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">

          {/* ── Left Panel: Gauge + Controls ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col gap-4"
          >
            {/* Gauge Card */}
            <div className={`
              rounded-xl border-2 ${borderClass} bg-war-card/60 backdrop-blur-sm p-5
              shadow-inner transition-all duration-1000
              ${currentScore >= 65 ? "shadow-glow-panic" : currentScore < 35 ? "shadow-glow-calm" : "shadow-glow-neutral"}
            `}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-mono-tech tracking-widest">// מד הפאניקה הלאומי</span>
                <span className={`text-xs font-mono-tech font-bold ${textClass}`}>PANIC-O-METER</span>
              </div>
              <MoodGauge score={currentScore} />
            </div>

            {/* Connection Status Panel */}
            <SimulateToggle
              isSimulate={isSimulate}
              isFallback={isFallback}
              onToggle={(val) => { setIsSimulate(val); setIsFallback(false); setError(null); }}
              scenario={scenario}
              onScenarioChange={setScenario}
            />

            {/* Boom Button */}
            <BoomButton onPress={handleBoomPress} />

            {/* Stats mini grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "כותרות מנוטרות", value: data.top_headlines.length, icon: <Newspaper size={14} /> },
                { label: "עדכון אחרון", value: lastRefresh.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }), icon: <Activity size={14} /> },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-lg border border-war-border bg-war-card/40 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                    {stat.icon}
                    <span className="text-xs">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-mono font-bold ${textClass}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Daily trend chart */}
            <DailyChart borderClass={borderClass} textClass={textClass} />
          </motion.div>

          {/* ── Right Panel: Headlines ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col gap-4"
          >
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper size={15} className={textClass} />
                <span className="text-sm font-bold">כותרות משפיעות</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono-tech">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-score-panic/70 inline-block" />
                  מעלה מתח
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-score-calm/70 inline-block" />
                  מוריד מתח
                </span>
              </div>
            </div>

            {/* Headlines list */}
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg border border-war-border/30 bg-war-card/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <HeadlinesFeed headlines={data.top_headlines} />
            )}

            {/* Footer note */}
            <div className="mt-auto pt-3 border-t border-war-border/30">
              <p className="text-xs text-muted-foreground font-mono-tech text-center">
                {isSimulate || isFallback
                  ? isFallback ? "// נתוני ברירת מחדל — אין חיבור לשרת" : "// נתוני סימולציה — לא נתוני חדשות אמיתיים"
                  : `מקורות: Ynet, Walla, Mako, Maariv`}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Footer ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center text-xs text-muted-foreground font-mono-tech py-4 border-t border-war-border/30"
        >
          NATIONAL PULSE // מצב הרוח הלאומי // {new Date().getFullYear()} // NOT OFFICIAL NEWS // <a href="https://github.com/noamfuss/national-mood-meter" className="underline hover:text-foreground transition-colors">github</a>
        </motion.footer>
      </div>
    </div>
  );
}
