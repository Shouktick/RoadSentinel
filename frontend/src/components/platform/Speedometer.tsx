"use client";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  value: number;
  max?: number;
  unit?: string;
  label?: string;
  compact?: boolean;
  legalLimit?: number;
  onChange?: (value: number) => void;
  min?: number;
};
function point(value: number, radius: number, max: number) {
  const angle = Math.PI - (value / max) * Math.PI;
  return {
    x: 180 + radius * Math.cos(angle),
    y: 178 - radius * Math.sin(angle),
  };
}
function arc(start: number, end: number, radius: number, max: number) {
  const a = point(start, radius, max),
    b = point(end, radius, max);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
}

export default function Speedometer({
  value,
  max = 70,
  unit = "mph",
  label = "Posted speed limit",
  compact = false,
  legalLimit,
  onChange,
  min = 20,
}: Props) {
  const reduced = useReducedMotion();
  const bounded = Math.max(0, Math.min(max, value));
  return (
    <div className={`speedometer ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 360 238"
        role="img"
        aria-label={`${label}: ${value} ${unit}`}
      >
        <path
          d={arc(0, max, 143, max)}
          fill="none"
          stroke="var(--stroke)"
          strokeWidth="12"
        />
        <path
          d={arc(0, bounded, 143, max)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
        />
        {Array.from({ length: 29 }, (_, i) => {
          const speed = (i * max) / 28,
            a = point(speed, 129, max),
            b = point(speed, i % 4 ? 124 : 118, max),
            text = point(speed, 101, max);
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--muted)"
                strokeWidth={i % 4 ? 1 : 2}
              />
              {i % 4 === 0 && (
                <text
                  x={text.x}
                  y={text.y + 4}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="10"
                >
                  {Math.round(speed)}
                </text>
              )}
            </g>
          );
        })}
        {legalLimit !== undefined &&
          (() => {
            const a = point(legalLimit, 135, max),
              b = point(legalLimit, 153, max);
            return (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--text)"
                strokeWidth="3"
              >
                <title>Verified legal limit: {legalLimit}</title>
              </line>
            );
          })()}
        <motion.line
          initial={false}
          x1="180"
          y1="178"
          animate={{
            x2: point(bounded, 117, max).x,
            y2: point(bounded, 117, max).y,
          }}
          transition={{ duration: reduced ? 0 : 0.55, ease: "easeOut" }}
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="180"
          cy="178"
          r="7"
          fill="var(--surface)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="180"
          y="125"
          textAnchor="middle"
          fill="var(--text)"
          fontSize="47"
          fontWeight="600"
          fontFamily="var(--display)"
        >
          {value}
        </text>
        <text
          x="180"
          y="146"
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="11"
        >
          {unit}
        </text>
        <text
          x="180"
          y="215"
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="11"
          letterSpacing="1.6"
        >
          {label.toUpperCase()}
        </text>
      </svg>
      {onChange && (
        <label className="gauge-slider">
          <span className="sr-only">{label}</span>
          <input
            type="range"
            min={min}
            max={max}
            step="10"
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-valuetext={`${value} ${unit}`}
          />
        </label>
      )}
      <p className="microcopy">
        The gauge shows a posted limit, not a safe driving speed.
      </p>
    </div>
  );
}
