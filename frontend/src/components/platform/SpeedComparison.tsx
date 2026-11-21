"use client";
import { useState } from "react";
import { physics, type Assumptions } from "@/lib/speed-physics";
import { Panel } from "./ui";

export default function SpeedComparison({ inputs }: { inputs: Assumptions }) {
  const [speeds, setSpeeds] = useState(["30", "50", "80", "100"]);
  const rows = speeds.map((s) =>
    Number.isInteger(Number(s)) ? physics(Number(s), inputs) : null,
  );
  const largest = Math.max(1, ...rows.map((r) => r?.stopping ?? 0));
  return (
    <Panel
      title="Compare speeds"
      subtitle="Edit any speed to compare stopping distances under the same assumptions."
    >
      <div className="speed-legend">
        <span>Reaction distance</span>
        <span>Braking distance</span>
      </div>
      <div className="speed-chart">
        {speeds.map((s, i) => {
          const r = rows[i];
          const invalid =
            Number(s) < 5 || Number(s) > 150 || !Number.isInteger(Number(s));
          return (
            <div className="speed-chart-row" key={i}>
              <label>
                <input
                  aria-label={`Comparison speed ${i + 1} (km/h)`}
                  type="number"
                  min="5"
                  max="150"
                  step="1"
                  value={s}
                  aria-invalid={invalid}
                  onChange={(e) =>
                    setSpeeds(
                      speeds.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                />{" "}
                km/h
              </label>
              <div>
                <div className="speed-chart-track" aria-hidden="true">
                  {r && (
                    <>
                      <i
                        style={{ width: (100 * r.reaction) / largest + "%" }}
                      />
                      <b style={{ width: (100 * r.braking) / largest + "%" }} />
                    </>
                  )}
                </div>
                <small>
                  {r
                    ? `${r.reaction.toFixed(1)} m reaction + ${r.braking.toFixed(1)} m braking`
                    : invalid
                      ? "Enter a whole speed from 5 to 150 km/h."
                      : "Check the calculation assumptions."}
                </small>
              </div>
              <strong
                aria-label={
                  r
                    ? `Total stopping distance ${r.stopping.toFixed(1)} metres`
                    : undefined
                }
              >
                {r?.stopping.toFixed(1) ?? "—"} m
              </strong>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
