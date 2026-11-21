"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  MapPinned,
  MoveRight,
  Route,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import IndiaExplorer from "./IndiaExplorer";
const tasks = [
  {
    href: "/map",
    icon: MapPinned,
    title: "Know your region",
    text: "Explore reported accidents across India's states and union territories.",
    tag: "OFFICIAL INDIA DATA",
  },
  {
    href: "/speed-monitor",
    icon: Route,
    title: "Monitor my ride",
    text: "Check GPS speed, record road conditions and find emergency help.",
    tag: "PASSENGER TOOLS",
  },
  {
    href: "/predict",
    icon: SlidersHorizontal,
    title: "Explore a crash scenario",
    text: "Study injury-severity estimates using documented Karnataka crash records.",
    tag: "KARNATAKA RESEARCH",
  },
];
const checks = [
  "Check tyres, lights and mirrors",
  "Wear a seat belt or a correctly fastened helmet",
  "Set navigation before moving; keep your phone away",
  "Plan a rest stop and check local weather",
];
export default function Dashboard() {
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <div className="page-stack launchpad">
      <section className="journey-hero" aria-labelledby="journey-title">
        <div className="journey-copy">
          <span className="launch-kicker">
            <span /> BUILT FOR INDIAN ROADS
          </span>
          <h1 id="journey-title">
            A clearer view.
            <br />
            <em>A more informed journey.</em>
          </h1>
          <p>
            Understand your region. Explore real crash patterns. Make time for
            the checks that matter before you leave.
          </p>
          <div className="actions">
            <Link className="button primary" href="/map">
              Explore India <MoveRight size={17} />
            </Link>
            <Link className="hero-secondary" href="/speed-monitor">
              Try the speed explorer <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-provenance">
            <ShieldCheck size={16} />
            India data. Clear sources. No live traffic or route-safety claims.
          </div>
        </div>
        <div className="road-scene" aria-hidden="true">
          <div className="scene-caption">
            THE ROAD AHEAD <span>INDIA / EXPLORER</span>
          </div>
          <svg viewBox="0 0 460 320" fill="none">
            <defs>
              <linearGradient
                id="road-line"
                x1="230"
                y1="0"
                x2="230"
                y2="320"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#76e6cb" stopOpacity="0" />
                <stop offset="1" stopColor="#76e6cb" />
              </linearGradient>
            </defs>
            <path
              d="M174 0C174 80 310 65 285 150S80 230 65 320M211 0C211 85 347 65 322 156S117 235 102 320M248 0C248 90 384 65 359 162S154 240 139 320"
              stroke="url(#road-line)"
              strokeWidth="2"
            />
            <path
              className="moving-lane"
              d="M211 0C211 85 347 65 322 156S117 235 102 320"
              stroke="#d4ff79"
              strokeWidth="3"
              strokeDasharray="9 18"
            />
            <circle cx="311" cy="184" r="26" fill="#71e5c3" fillOpacity=".1" />
            <circle cx="311" cy="184" r="8" fill="#d4ff79" />
            <circle
              cx="311"
              cy="184"
              r="15"
              stroke="#71e5c3"
              strokeOpacity=".5"
            />
          </svg>
          <div className="scene-label">
            <span className="scene-dot" />
            Perspective, before prediction.
            <small>Explore the evidence behind every number.</small>
          </div>
        </div>
      </section>
      <section aria-labelledby="start-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2 id="start-title">What would you like to explore?</h2>
          </div>
          <span>Three useful places to start</span>
        </div>
        <div className="task-grid">
          {tasks.map(({ href, icon: Icon, title, text, tag }, i) => (
            <Link href={href} className="task-card" key={href}>
              <div className="task-top">
                <Icon size={24} />
                <span>0{i + 1}</span>
              </div>
              <span className="task-tag">{tag}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="task-link">
                Open explorer <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="departure-card" aria-labelledby="departure-title">
        <div>
          <span className="eyebrow">BEFORE YOU GO</span>
          <h2 id="departure-title">A minute for the essentials.</h2>
          <p>
            A personal trip checklist. Your selections stay on this page and
            reset when you leave.
          </p>
          <div
            className="checklist-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={checks.length}
            aria-valuenow={checked.length}
            aria-label={`${checked.length} of ${checks.length} checks selected`}
          >
            <span
              style={{ width: `${(checked.length / checks.length) * 100}%` }}
            />
          </div>
          <strong aria-live="polite">
            {checked.length} / {checks.length} checked
          </strong>
        </div>
        <div className="departure-checks">
          {checks.map((text) => (
            <label
              key={text}
              className={checked.includes(text) ? "is-checked" : ""}
            >
              <input
                type="checkbox"
                checked={checked.includes(text)}
                onChange={(e) =>
                  setChecked((current) =>
                    e.target.checked
                      ? [...current, text]
                      : current.filter((x) => x !== text),
                  )
                }
              />
              <span className="checkmark">
                <Check size={13} />
              </span>
              {text}
            </label>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h2>Explore the national evidence.</h2>
        </div>
        <Link className="text-link" href="/analytics">
          Open state statistics <ArrowUpRight size={15} />
        </Link>
      </div>
      <IndiaExplorer mode="overview" />
    </div>
  );
}
