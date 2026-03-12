import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Siren, MapPin, Clock } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";
const REFRESH_INTERVAL = 30_000; // 30 seconds — alerts are time-sensitive

interface AlertData {
  time: string;
  zones: string[];
}

export default function AlertsPanel() {
  const [alert, setAlert] = useState<AlertData | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      if (!res.ok) throw new Error();
      const data: AlertData = await res.json();
      // Only show panel if there are active zones
      setAlert(data.zones?.length > 0 ? data : null);
    } catch {
      setAlert(null);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.97 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.97 }}
          transition={{ duration: 0.35 }}
          className="rounded-lg border border-score-panic/60 bg-score-panic/10 p-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Siren size={14} className="text-score-panic animate-pulse" />
            <span className="text-xs font-mono-tech font-bold text-score-panic tracking-widest">
              // התראות פעילות
            </span>
            <span className="mr-auto flex items-center gap-1 text-[10px] font-mono-tech text-muted-foreground">
              <Clock size={10} />
              {new Date(alert.time).toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Zones */}
          <div className="flex flex-wrap gap-1.5">
            {alert.zones.filter(Boolean).map((zone) => (
              <span
                key={zone}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-score-panic/40 bg-score-panic/15 text-score-panic text-[11px] font-mono-tech"
              >
                <MapPin size={9} />
                {zone}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
