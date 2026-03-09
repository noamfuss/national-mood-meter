import { motion } from "framer-motion";
import { Info, ArrowRight, Shield, Activity, Brain } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background grid-bg relative overflow-x-hidden transition-all duration-1000"
    >
      {/* Scanline overlay */}
      <div className="fixed inset-0 scanline pointer-events-none z-0 opacity-40" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 space-y-8 text-right">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between border-b border-war-border/30 pb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border-2 border-score-neutral flex items-center justify-center">
              <Info size={20} className="text-score-neutral" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-foreground">
                אודות המיזם
              </h1>
              <p className="text-xs text-muted-foreground font-mono-tech tracking-widest mt-0.5 uppercase">
                SYSTEM INFORMATION // v2.0
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-mono-tech text-muted-foreground hover:text-foreground transition-colors group"
          >
            חזרה למדד <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.header>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-war-card/60 backdrop-blur-sm border-2 border-war-border p-8 rounded-xl space-y-6 shadow-glow-neutral"
        >
          <div className="space-y-4">
            <p className="text-lg leading-relaxed text-foreground">
              אתר זה אוסף כותרות ממגוון אתרי חדשות ומשתמש ב-AI כדי לדרג כל אחת מהן, ולבסוף אומר לכם כמה כדאי להיות בפאניקה.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              האלגוריתם מנתח את הסנטימנט, רמת הדחיפות וההקשר של כל כותרת כדי לחשב את "מדד הפאניקה הלאומי". הנתונים מתעדכנים כל 10 דקות כדי לתת תמונת מצב עדכנית של התחושה הציבורית כפי שהיא משתקפת בכלי התקשורת.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="p-4 rounded-lg border border-war-border/30 bg-war-card/40 text-center space-y-2">
              <Shield size={24} className="mx-auto text-score-calm" />
              <h3 className="text-xs font-mono-tech font-bold uppercase">Data Source</h3>
              <p className="text-sm">חדשות בזמן אמת</p>
            </div>
            <div className="p-4 rounded-lg border border-war-border/30 bg-war-card/40 text-center space-y-2">
              <Brain size={24} className="mx-auto text-score-neutral" />
              <h3 className="text-xs font-mono-tech font-bold uppercase">Analysis</h3>
              <p className="text-sm">בינה מלאכותית</p>
            </div>
            <div className="p-4 rounded-lg border border-war-border/30 bg-war-card/40 text-center space-y-2">
              <Activity size={24} className="mx-auto text-score-panic" />
              <h3 className="text-xs font-mono-tech font-bold uppercase">Update Rate</h3>
              <p className="text-sm">כל 10 דקות</p>
            </div>
          </div>

          <div className="pt-8 border-t border-war-border/30">
            <p className="text-sm text-muted-foreground font-mono-tech text-center">
              שימו לב: המדד הינו אומדן ויזואלי בלבד ואינו מהווה המלצה או מקור חדשות רשמי.
            </p>
          </div>
        </motion.div>

        {/* Credits */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center space-y-2 pt-4"
        >
          <p className="text-sm text-muted-foreground font-mono-tech">
            הושקע באהבה (ובקצת חרדה) על ידי:
          </p>
          <p className="text-xl font-black text-foreground">
            נועם פוס
          </p>
          <div className="flex justify-center gap-4 pt-4">
             <a href="https://github.com/noamfuss" className="text-xs text-muted-foreground underline hover:text-foreground">GitHub</a>
             <span className="text-muted-foreground/30">//</span>
             <Link to="/" className="text-xs text-muted-foreground underline hover:text-foreground">דף הבית</Link>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
