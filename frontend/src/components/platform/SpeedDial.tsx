"use client";
import { motion, useReducedMotion } from "framer-motion";

const angle = (fraction: number) => -135 + 270 * fraction;
function point(degrees: number, radius: number) {
  const radians = (degrees * Math.PI) / 180;
  return [160 + radius * Math.sin(radians), 160 - radius * Math.cos(radians)];
}
const [start, end] = [-135, 135].map((a) => point(a, 145).join(" "));
const arc = `M ${start} A 145 145 0 1 1 ${end}`;

export default function SpeedDial({ speed }: { speed: number | null }) {
  const reduced = useReducedMotion();
  const maximum = 150 * Math.max(1, Math.ceil((speed ?? 0) / 150));
  return (
    <div
      className="speed-dial"
      role="img"
      aria-label={
        speed === null ? "Speed unavailable" : `Speedometer at ${speed} km/h`
      }
    >
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <circle cx="160" cy="160" r="155" fill="none" stroke="#314451" />
        <circle cx="160" cy="160" r="94" fill="none" stroke="#293c47" />
        <path
          d={arc}
          fill="none"
          stroke="#354453"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {speed !== null && (
          <path
            d={arc}
            fill="none"
            stroke="#bdea83"
            strokeWidth="5"
            pathLength={maximum}
            strokeDasharray={`${speed} ${maximum}`}
            strokeLinecap="round"
          />
        )}
        {Array.from({ length: 76 }, (_, i) => {
          const major = i % 5 === 0;
          const a = angle(i / 75);
          const [x1, y1] = point(a, 137);
          const [x2, y2] = point(a, major ? 126 : 132);
          const [x, y] = point(a, 113);
          return (
            <g key={i}>
              <line
                {...{ x1, y1, x2, y2 }}
                stroke={major ? "#d6e2e6" : "#6d8390"}
                strokeWidth={major ? 2 : 1}
              />
              {major && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#c8d5dd"
                  fontSize="10"
                >
                  {(i * maximum) / 75}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {speed !== null && (
        <motion.div
          className="speed-pointer"
          aria-hidden="true"
          initial={false}
          animate={{ rotate: angle(speed / maximum) }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 220, damping: 30 }
          }
        >
          <svg viewBox="0 0 320 320">
            <path d="M160 14 L164 34 L160 39 L156 34 Z" fill="#d9ffa5" />
          </svg>
        </motion.div>
      )}
      <div className="speed-digits" aria-hidden="true">
        <strong>{speed ?? "—"}</strong>
        <span>km/h</span>
      </div>
      <div className="speed-converted" aria-hidden="true">
        {speed === null ? "—" : (speed / 1.609344).toFixed(1)} mph
      </div>
    </div>
  );
}
