import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, X, TrendingUp, Zap, Newspaper, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
} from "recharts";

const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PanicByTimeItem { hour: number; average_panic: number; }
interface StressfulSourceItem { source: string; avg_impact: number; num_headlines: number; }
interface SentimentItem { sentiment_type: string; count: number; percentage: number; }

interface StatisticsData {
  panic_by_time: PanicByTimeItem[];
  most_stressful_source: StressfulSourceItem | null;
  sentiment_variation: SentimentItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(val: number) {
  if (val >= 65) return "hsl(0 100% 55%)";
  if (val >= 35) return "hsl(50 100% 55%)";
  return "hsl(150 100% 45%)";
}

const SENTIMENT_COLORS: Record<string, string> = {
  "מלחיץ":   "hsl(0 100% 55%)",
  "מרגיע":   "hsl(150 100% 45%)",
  "נייטרלי": "hsl(50 100% 55%)",
};

// ─── Custom tooltip for bar chart ─────────────────────────────────────────────
function HourTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="rounded-lg border border-war-border bg-war-card/90 px-3 py-2 text-xs font-mono-tech shadow-xl backdrop-blur-sm">
      <p className="text-muted-foreground mb-0.5">{`שעה ${String(label).padStart(2, "0")}:00`}</p>
      <p style={{ color: scoreColor(val) }} className="font-bold text-sm">{val}</p>
    </div>
  );
}

// ─── Custom tooltip for pie chart ─────────────────────────────────────────────
function SentimentTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-war-border bg-war-card/90 px-3 py-2 text-xs font-mono-tech shadow-xl backdrop-blur-sm">
      <p style={{ color: item.payload.fill }} className="font-bold">{item.name}</p>
      <p className="text-muted-foreground">{item.value} כותרות ({item.payload.percentage}%)</p>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-mono-tech text-muted-foreground tracking-widest mb-3">
      // {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AlertsStatsDialog() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/statistics`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchStats(); }, [open, fetchStats]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Build full 24-hour array (fill missing hours with 0)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = stats?.panic_by_time.find((p) => p.hour === i);
    return { hour: i, average_panic: found ? found.average_panic : 0 };
  });

  const sentimentData = (stats?.sentiment_variation ?? []).map((s) => ({
    name: s.sentiment_type,
    value: s.count,
    percentage: s.percentage,
    fill: SENTIMENT_COLORS[s.sentiment_type] ?? "hsl(210 20% 50%)",
  }));

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-lg border border-war-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 hover:border-current"
        title="סטטיסטיקות"
      >
        <BarChart2 size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ duration: 0.28, type: "spring", stiffness: 300, damping: 26 }}
              dir="rtl"
              className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-war-border bg-background shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-war-border/50 bg-background/95 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-score-neutral" />
                  <span className="font-black text-base tracking-tight">סטטיסטיקות מצב הרוח</span>
                  <span className="text-[10px] font-mono-tech text-muted-foreground">// STATISTICS</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-md border border-war-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center h-60 text-muted-foreground text-xs font-mono-tech gap-2">
                    <BarChart2 size={14} className="animate-pulse" />
                    טוען נתונים...
                  </div>
                )}

                {/* Error */}
                {!loading && error && (
                  <div className="flex items-center justify-center h-60 gap-2 text-score-panic text-xs font-mono-tech">
                    <AlertTriangle size={14} />
                    לא ניתן לטעון נתונים — השרת לא מחובר
                  </div>
                )}

                {/* Content */}
                {!loading && !error && stats && (
                  <div className="flex flex-col gap-8">

                    {/* ── Chart 1: Hourly Panic Bar Chart ── */}
                    <div>
                      <SectionLabel>ממוצע פאניקה לפי שעה ביממה</SectionLabel>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={hourlyData}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                            barCategoryGap="20%"
                          >
                            <XAxis
                              dataKey="hour"
                              tick={{ fill: "hsl(210 20% 50%)", fontSize: 10, fontFamily: "Cascadia Code, Share Tech Mono, monospace" }}
                              tickFormatter={(v) => `${String(v).padStart(2, "0")}`}
                              interval={2}
                              axisLine={{ stroke: "hsl(180 40% 15%)" }}
                              tickLine={false}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: "hsl(210 20% 50%)", fontSize: 10, fontFamily: "Cascadia Code, Share Tech Mono, monospace" }}
                              axisLine={{ stroke: "hsl(180 40% 15%)" }}
                              tickLine={false}
                            />
                            <Tooltip content={<HourTooltip />} cursor={{ fill: "hsl(180 40% 15% / 0.4)" }} />
                            <ReferenceLine y={65} stroke="hsl(0 100% 55% / 0.4)" strokeDasharray="4 3" />
                            <ReferenceLine y={35} stroke="hsl(50 100% 55% / 0.3)" strokeDasharray="4 3" />
                            <Bar dataKey="average_panic" radius={[3, 3, 0, 0]}>
                              {hourlyData.map((entry, i) => (
                                <Cell key={i} fill={scoreColor(entry.average_panic)} fillOpacity={entry.average_panic === 0 ? 0.15 : 0.8} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-2 justify-center text-[10px] font-mono-tech text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-score-calm inline-block opacity-80" />שקט (&lt;35)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-score-neutral inline-block opacity-80" />מתח (35–65)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-score-panic inline-block opacity-80" />פאניקה (&gt;65)</span>
                      </div>
                    </div>

                    {/* ── Chart 2 + Card: Sentiment Donut + Most Stressful Source ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                      {/* Sentiment Donut */}
                      <div>
                        <SectionLabel>התפלגות כותרות לפי סנטימנט</SectionLabel>
                        {sentimentData.length > 0 ? (
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={sentimentData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius="52%"
                                  outerRadius="75%"
                                  paddingAngle={3}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {sentimentData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                                  ))}
                                </Pie>
                                <Tooltip content={<SentimentTooltip />} />
                                <Legend
                                  iconType="circle"
                                  iconSize={8}
                                  formatter={(value) => (
                                    <span style={{ fontSize: 11, fontFamily: "Cascadia Code, Share Tech Mono, monospace", color: "hsl(210 20% 60%)" }}>
                                      {value}
                                    </span>
                                  )}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-52 flex items-center justify-center text-muted-foreground text-xs font-mono-tech">
                            // אין נתונים זמינים
                          </div>
                        )}
                      </div>

                      {/* Most Stressful Source Card */}
                      <div>
                        <SectionLabel>מקור הלחץ הגבוה ביותר — 24 שעות</SectionLabel>
                        {stats.most_stressful_source ? (
                          <div className="flex flex-col gap-4 p-4 rounded-xl border border-score-panic/30 bg-score-panic/5 h-[calc(100%-1.75rem)]">
                            {/* Source name */}
                            <div className="flex items-start gap-2">
                              <Newspaper size={14} className="text-score-panic mt-0.5 shrink-0" />
                              <p className="text-lg font-black leading-tight text-foreground break-words">
                                {stats.most_stressful_source.source}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                              {/* Avg impact */}
                              <div className="flex flex-col gap-1 p-3 rounded-lg border border-war-border bg-war-card/60">
                                <span className="text-[10px] font-mono-tech text-muted-foreground tracking-widest flex items-center gap-1">
                                  <Zap size={9} /> השפעה ממוצעת
                                </span>
                                <p className="text-2xl font-mono font-black text-score-panic leading-none">
                                  {stats.most_stressful_source.avg_impact.toFixed(1)}
                                </p>
                              </div>
                              {/* Headline count */}
                              <div className="flex flex-col gap-1 p-3 rounded-lg border border-war-border bg-war-card/60">
                                <span className="text-[10px] font-mono-tech text-muted-foreground tracking-widest flex items-center gap-1">
                                  <Newspaper size={9} /> כותרות
                                </span>
                                <p className="text-2xl font-mono font-black text-foreground leading-none">
                                  {stats.most_stressful_source.num_headlines}
                                </p>
                              </div>
                            </div>

                            {/* Impact bar */}
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[10px] font-mono-tech text-muted-foreground">
                                <span>עוצמת לחץ</span>
                                <span>{Math.round((stats.most_stressful_source.avg_impact / 10) * 100)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-war-border overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (stats.most_stressful_source.avg_impact / 10) * 100)}%` }}
                                  transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                                  className="h-full rounded-full bg-score-panic/70"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-52 flex items-center justify-center text-muted-foreground text-xs font-mono-tech">
                            // אין נתונים זמינים
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
