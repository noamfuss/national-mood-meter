import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  type TooltipProps,
} from "recharts";
import { Activity } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";
const REFRESH_INTERVAL = 5 * 60_000; // 5 minutes

interface DailyScoreItem {
  timestamp: string;
  score: number;
  top_headline: string | null;
  impact: number | null;
}

interface ChartPoint {
  time: string;
  score: number;
  top_headline: string | null;
  impact: number | null;
}

// Color for a given score using the war-room palette
function scoreColor(score: number): string {
  if (score < 35) return "hsl(150, 100%, 45%)";
  if (score < 65) return "hsl(50, 100%, 55%)";
  return "hsl(0, 100%, 55%)";
}

// Custom dot that colours itself based on score
const ScoreDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={scoreColor(payload.score)}
      stroke="hsl(220, 30%, 4%)"
      strokeWidth={1.5}
    />
  );
};

// Custom animated active dot
const ActiveDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const col = scoreColor(payload.score);
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={col} opacity={0.2} />
      <circle cx={cx} cy={cy} r={5} fill={col} stroke="hsl(220, 30%, 4%)" strokeWidth={1.5} />
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const d: ChartPoint = payload[0].payload;
  const col = scoreColor(d.score);

  return (
    <div
      className="rounded-lg border bg-card px-3 py-2 text-xs shadow-xl font-mono-tech"
      style={{ borderColor: col, direction: "rtl", maxWidth: 240 }}
    >
      <p className="font-bold mb-1" style={{ color: col }}>
        ציון: {d.score}
      </p>
      <p className="text-muted-foreground mb-1">{d.time}</p>
      {d.top_headline && (
        <p className="text-foreground/80 leading-snug">{d.top_headline}</p>
      )}
      {d.impact != null && (
        <p style={{ color: d.impact >= 0 ? "hsl(0, 100%, 55%)" : "hsl(150, 100%, 45%)" }}>
          השפעה: {d.impact > 0 ? "+" : ""}{d.impact}
        </p>
      )}
    </div>
  );
};

// Gradient line segment — recharts draws the whole line one colour, so we
// use a linearGradient fill trick with a defs element.
const GRADIENT_ID = "scoreLineGradient";

export default function DailyChart({ borderClass, textClass }: { borderClass: string; textClass: string }) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchChartData = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/daily-scores`);
      if (!r.ok) throw new Error();
      const data = (await r.json()) as DailyScoreItem[];
      setPoints(
        data.map((d) => ({
          time: new Date(d.timestamp).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          score: d.score,
          top_headline: d.top_headline ?? null,
          impact: d.impact ?? null,
        }))
      );
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData(true);

    const interval = setInterval(() => {
      fetchChartData(false);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const lastScore = points.at(-1)?.score ?? 50;
  const lineColor = scoreColor(lastScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className={`rounded-xl border-2 ${borderClass} bg-war-card/60 backdrop-blur-sm p-5 shadow-inner`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground font-mono-tech tracking-widest">
          // מגמה יומית
        </span>
        <span className={`text-xs font-mono-tech font-bold ${textClass}`}>
          DAILY TREND
        </span>
      </div>

      {loading && (
        <div className="h-40 flex items-center justify-center gap-2 text-muted-foreground text-xs font-mono-tech">
          <Activity size={14} className="animate-pulse" />
          טוען נתונים...
        </div>
      )}

      {!loading && error && (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-xs font-mono-tech">
          אין נתוני היסטוריה — השרת לא מחובר
        </div>
      )}

      {!loading && !error && points.length === 0 && (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-xs font-mono-tech">
          אין עדיין נקודות נתונים להיום
        </div>
      )}

      {!loading && !error && points.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={points} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(180 100% 50% / 0.06)"
              vertical={false}
            />

            {/* Zone reference lines */}
            <ReferenceLine y={65} stroke="hsl(0, 100%, 55%)" strokeDasharray="4 4" strokeOpacity={0.35} />
            <ReferenceLine y={35} stroke="hsl(150, 100%, 45%)" strokeDasharray="4 4" strokeOpacity={0.35} />

            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(210, 20%, 50%)", fontSize: 10, fontFamily: "Share Tech Mono, monospace" }}
              axisLine={{ stroke: "hsl(180 40% 15%)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 35, 65, 100]}
              tick={{ fill: "hsl(210, 20%, 50%)", fontSize: 10, fontFamily: "Share Tech Mono, monospace" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: lineColor, strokeOpacity: 0.3, strokeWidth: 1 }}
              position={{ y: -60 }}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={<ActiveDot />}
              isAnimationActive={true}
              animationDuration={800}
              style={{ filter: `drop-shadow(0 0 6px ${lineColor}55)` }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      {!loading && !error && points.length > 0 && (
        <div className="flex items-center justify-end gap-4 mt-3 text-[10px] font-mono-tech text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-score-panic inline-block opacity-60" style={{ borderTop: "2px dashed" }} />
            פאניקה 65+
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-score-calm inline-block opacity-60" style={{ borderTop: "2px dashed" }} />
            רגוע &lt;35
          </span>
        </div>
      )}
    </motion.div>
  );
}
