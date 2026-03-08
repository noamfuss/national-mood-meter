import { motion } from "framer-motion";
import { getScoreLabel } from "@/lib/moodData";

interface MoodGaugeProps {
  score: number;
}

export default function MoodGauge({ score }: MoodGaugeProps) {
  const { color, textClass, label } = getScoreLabel(score);

  // SVG gauge constants
  const cx = 150;
  const cy = 140;
  const r = 110;
  const strokeWidth = 16;

  // Semi-circle: starts at 180° (left), ends at 0° (right)
  // Arc length for full semi-circle
  const circumference = Math.PI * r; // half circle
  const progress = score / 100;
  const dashOffset = circumference * (1 - progress);

  // Needle angle: -90° (left/0) to +90° (right/100) mapped from score
  const needleAngle = -90 + progress * 180;

  // Color stops for the track
  const gradientId = "gauge-gradient";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 300 170"
        className="w-full max-w-xs"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(150, 100%, 45%)" />
            <stop offset="50%" stopColor="hsl(50, 100%, 55%)" />
            <stop offset="100%" stopColor="hsl(0, 100%, 55%)" />
          </linearGradient>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="hsl(220, 20%, 12%)"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
        />

        {/* Gradient colored track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Active progress arc */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          filter="url(#glow-filter)"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = -180 + (tick / 100) * 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + (r - strokeWidth / 2 - 2) * Math.cos(rad);
          const y1 = cy + (r - strokeWidth / 2 - 2) * Math.sin(rad);
          const x2 = cx + (r + strokeWidth / 2 + 6) * Math.cos(rad);
          const y2 = cy + (r + strokeWidth / 2 + 6) * Math.sin(rad);
          return (
            <line
              key={tick}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(180, 40%, 25%)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Tick labels */}
        {[
          { val: 0, label: "0" },
          { val: 50, label: "50" },
          { val: 100, label: "100" },
        ].map(({ val, label: lbl }) => {
          const angle = -180 + (val / 100) * 180;
          const rad = (angle * Math.PI) / 180;
          const x = cx + (r + 22) * Math.cos(rad);
          const y = cy + (r + 22) * Math.sin(rad);
          return (
            <text
              key={val}
              x={x} y={y + 4}
              textAnchor="middle"
              fontSize="9"
              fill="hsl(180, 40%, 45%)"
              fontFamily="Share Tech Mono, monospace"
            >
              {lbl}
            </text>
          );
        })}

        {/* Needle */}
        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          initial={{ rotate: -90 }}
          animate={{ rotate: needleAngle }}
          transition={{ duration: 1.5, ease: "easeOut", type: "spring", stiffness: 60 }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + strokeWidth + 5}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#glow-filter)"
          />
          <circle cx={cx} cy={cy} r={6} fill={color} filter="url(#glow-filter)" />
          <circle cx={cx} cy={cy} r={3} fill="hsl(220, 30%, 4%)" />
        </motion.g>

        {/* Score text */}
        <motion.text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fontSize="38"
          fontWeight="700"
          fontFamily="Share Tech Mono, monospace"
          fill={color}
          filter="url(#glow-filter)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {score}
        </motion.text>

        {/* Label */}
        <text
          x={cx}
          y={cy + 42}
          textAnchor="middle"
          fontSize="11"
          fill="hsl(180, 40%, 50%)"
          fontFamily="Heebo, sans-serif"
          fontWeight="500"
          letterSpacing="3"
        >
          {label.toUpperCase()}
        </text>

        {/* Bottom labels */}
        <text x={cx - r} y={cy + 20} textAnchor="middle" fontSize="8" fill="hsl(150, 80%, 40%)" fontFamily="Heebo, sans-serif">שלווה</text>
        <text x={cx + r} y={cy + 20} textAnchor="middle" fontSize="8" fill="hsl(0, 80%, 50%)" fontFamily="Heebo, sans-serif">פאניקה</text>
      </svg>
    </div>
  );
}
