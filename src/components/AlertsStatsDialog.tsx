import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, X, Siren, MapPin, Clock, TrendingUp, AlertTriangle, Shield } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

interface AlertStats {
  total_alerts_today: number;
  total_alerts_week: number;
  most_targeted_zones: { zone: string; count: number }[];
  recent_alerts: { time: string; zones: string[] }[];
  active_now: boolean;
  last_alert_time: string | null;
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-war-border bg-war-card/60">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono-tech tracking-widest">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-mono font-black leading-none ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default function AlertsStatsDialog() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchStats();
  }, [open, fetchStats]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Trigger button — styled same as refresh/about buttons */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-lg border border-war-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 hover:border-current"
        title="סטטיסטיקות התראות"
      >
        <BarChart2 size={15} />
      </button>

      {/* Backdrop + Dialog */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, type: "spring", stiffness: 320, damping: 28 }}
              dir="rtl"
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-war-border bg-background shadow-2xl p-6 overflow-y-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Siren size={16} className="text-score-panic" />
                  <span className="font-black text-base tracking-tight">סטטיסטיקות התראות</span>
                  <span className="text-[10px] font-mono-tech text-muted-foreground">// ALERT STATS</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-md border border-war-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-xs font-mono-tech gap-2">
                  <BarChart2 size={14} className="animate-pulse" />
                  טוען נתונים...
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="flex items-center justify-center h-40 gap-2 text-score-panic text-xs font-mono-tech">
                  <AlertTriangle size={14} />
                  לא ניתן לטעון נתונים — השרת לא מחובר
                </div>
              )}

              {/* Content */}
              {!loading && !error && stats && (
                <div className="flex flex-col gap-5">
                  {/* Active status badge */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono-tech font-bold tracking-widest
                    ${stats.active_now
                      ? "border-score-panic/50 bg-score-panic/10 text-score-panic"
                      : "border-score-calm/40 bg-score-calm/10 text-score-calm"}`
                  }>
                    {stats.active_now
                      ? <><Siren size={12} className="animate-pulse" /> התראה פעילה כעת</>
                      : <><Shield size={12} /> אין התראות פעילות כעת</>
                    }
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="התראות היום"
                      value={stats.total_alerts_today ?? "—"}
                      icon={<Clock size={10} />}
                      accent={stats.total_alerts_today > 0 ? "text-score-panic" : "text-foreground"}
                    />
                    <StatCard
                      label="התראות השבוע"
                      value={stats.total_alerts_week ?? "—"}
                      icon={<TrendingUp size={10} />}
                      accent="text-foreground"
                    />
                  </div>

                  {/* Most targeted zones */}
                  {stats.most_targeted_zones?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono-tech text-muted-foreground tracking-widest mb-2">
                        // אזורים מותקפים ביותר
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {stats.most_targeted_zones.map(({ zone, count }) => (
                          <div key={zone} className="flex items-center gap-2">
                            <MapPin size={10} className="text-score-panic shrink-0" />
                            <span className="text-xs font-mono-tech text-foreground/80 flex-1">{zone}</span>
                            {/* Bar */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-24 h-1.5 rounded-full bg-war-border overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-score-panic/70"
                                  style={{
                                    width: `${Math.min(100, (count / (stats.most_targeted_zones[0]?.count || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-score-panic w-4 text-left">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent alerts */}
                  {stats.recent_alerts?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono-tech text-muted-foreground tracking-widest mb-2">
                        // התראות אחרונות
                      </p>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {stats.recent_alerts.map((alert, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-war-border/50 bg-war-card/40">
                            <Clock size={10} className="text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-mono-tech text-muted-foreground mb-1">
                                {new Date(alert.time).toLocaleString("he-IL", {
                                  day: "2-digit", month: "2-digit",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {alert.zones.filter(Boolean).map((zone) => (
                                  <span key={zone} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-score-panic/30 bg-score-panic/10 text-score-panic text-[10px] font-mono-tech">
                                    <MapPin size={7} />
                                    {zone}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last alert time */}
                  {stats.last_alert_time && (
                    <p className="text-[10px] font-mono-tech text-muted-foreground text-center border-t border-war-border/30 pt-3">
                      התראה אחרונה:{" "}
                      {new Date(stats.last_alert_time).toLocaleString("he-IL", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
