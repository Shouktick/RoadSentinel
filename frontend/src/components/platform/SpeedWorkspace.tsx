"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Gauge, Minus, Plus, RotateCcw } from "lucide-react";
import { api, downloadText } from "@/lib/api";
import { assumptions, inRange, physics, speedRange } from "@/lib/speed-physics";
import { Failure, PageTitle, Panel } from "./ui";
import SpeedDial from "./SpeedDial";
import SpeedComparison from "./SpeedComparison";
import "./speed-explorer.css";

const row = z.object({
  speed_kmh: z.number(),
  reaction_distance_m: z.number(),
  braking_distance_m: z.number(),
  stopping_distance_m: z.number(),
  kinetic_energy_kj: z.number(),
});
const schema = z.object({
  kind: z.literal("physics_calculation"),
  model_version: z.null(),
  assumptions: z.record(z.string(), z.number()),
  selected: row,
  curve: z.array(row),
  explanation: z.string(),
});
export default function SpeedWorkspace() {
  const [speedText, setSpeed] = useState(String(speedRange.initial));
  const [draft, setDraft] = useState({
    reaction_seconds: "1.5",
    deceleration_ms2: "5",
    mass_kg: "1500",
  });
  const inputs = {
    reaction_seconds: Number(draft.reaction_seconds),
    deceleration_ms2: Number(draft.deceleration_ms2),
    mass_kg: Number(draft.mass_kg),
  };
  const speed = Number(speedText);
  const validSpeed =
    inRange(speed, speedRange.min, speedRange.max) && Number.isInteger(speed);
  const result = validSpeed ? physics(speed, inputs) : null;
  const request = { ...inputs, speed_kmh: speed };
  const run = useMutation({
    mutationFn: (values: typeof request) =>
      api("predict/speed-sweep", schema, {
        method: "POST",
        body: JSON.stringify(values),
      }),
  });
  const sweep =
    result &&
    run.data &&
    Object.entries(request).every(([key, v]) => run.data.assumptions[key] === v)
      ? run.data
      : null;
  function adjust(delta: number) {
    setSpeed(
      String(
        Math.min(
          speedRange.max,
          Math.max(
            speedRange.min,
            (validSpeed ? speed : speedRange.initial) + delta,
          ),
        ),
      ),
    );
  }
  return (
    <div className="page-stack speed-explorer">
      <PageTitle
        eyebrow="INDIA / SPEED EXPLORER"
        title="Physics-Based Speed & Stopping Distance Explorer"
        description="This interactive calculator demonstrates how vehicle speed affects reaction distance, braking distance and kinetic energy under user-defined assumptions. It is independent of the RoadSentinel accident-severity prediction model."
      />
      <section
        className="speed-cluster"
        aria-label="Speed and stopping distance"
      >
        <div className="speed-instrument">
          <h2>
            <Gauge size={18} /> Vehicle speed
          </h2>
          <SpeedDial speed={validSpeed ? speed : null} />
          <div className="speed-controls">
            <label htmlFor="speed_kmh">Speed (km/h)</label>
            <div className="speed-adjust">
              <button
                aria-label="Decrease speed by 1 km/h"
                disabled={validSpeed && speed === 5}
                onClick={() => adjust(-1)}
              >
                <Minus size={16} />
              </button>
              <input
                id="speed_kmh"
                type="number"
                min="5"
                max="150"
                step="1"
                value={speedText}
                onChange={(e) => setSpeed(e.target.value)}
                aria-invalid={!validSpeed}
                aria-describedby={!validSpeed ? "speed-error" : undefined}
              />
              <button
                aria-label="Increase speed by 1 km/h"
                disabled={validSpeed && speed === 150}
                onClick={() => adjust(1)}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="speed-reset"
              onClick={() => setSpeed(String(speedRange.initial))}
            >
              <RotateCcw size={14} /> Reset speed
            </button>
            <input
              aria-label="Adjust vehicle speed"
              type="range"
              min="5"
              max="150"
              step="1"
              value={validSpeed ? speed : speedRange.min}
              onChange={(e) => setSpeed(e.target.value)}
            />
            {!validSpeed && (
              <p id="speed-error">Enter a whole speed from 5 to 150 km/h.</p>
            )}
          </div>
        </div>
        <div className="speed-readings">
          <h2>Stopping distance</h2>
          <div className="speed-total" data-testid="stopping">
            {result?.stopping.toFixed(1) ?? "—"} <small>m</small>
          </div>
          <p>Distance travelled from noticing a hazard to coming to a stop.</p>
          <div className="speed-segments" aria-hidden="true">
            {result && (
              <>
                <i style={{ flex: result.reaction }} />
                <b style={{ flex: result.braking }} />
              </>
            )}
          </div>
          <dl className="speed-metrics">
            {(
              [
                [
                  "Reaction distance",
                  result?.reaction,
                  "m",
                  "Before braking begins",
                ],
                [
                  "Braking distance",
                  result?.braking,
                  "m",
                  "While the brakes are applied",
                ],
                [
                  "Kinetic energy",
                  result?.energy,
                  "kJ",
                  "Energy of the moving vehicle",
                ],
              ] as const
            ).map(([label, value, unit, detail]) => (
              <div key={label}>
                <dt>
                  {label}
                  <small>{detail}</small>
                </dt>
                <dd>
                  {value?.toFixed(1) ?? "—"} <small>{unit}</small>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <Panel
        title="Calculation assumptions"
        subtitle="All scenarios use these settings on level ground, with constant deceleration during braking."
      >
        <div className="speed-assumptions">
          {assumptions.map(({ key, label, unit, min, max }) => {
            const valid = inRange(inputs[key], min, max);
            return (
              <div className="field" key={key}>
                <label htmlFor={key}>
                  {label} ({unit})
                </label>
                <input
                  id={key}
                  type="number"
                  min={min}
                  max={max}
                  step="any"
                  value={draft[key]}
                  aria-invalid={!valid}
                  aria-describedby={!valid ? key + "-error" : undefined}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
                {!valid && (
                  <small id={key + "-error"}>
                    Enter {min} to {max} {unit}.
                  </small>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
      <SpeedComparison inputs={inputs} />
      <Panel
        title="Full speed sweep"
        subtitle="Calculate distances and energy from 10 to 150 km/h in 10 km/h steps."
      >
        <button
          className="button primary"
          disabled={!result || run.isPending}
          onClick={() => run.mutate(request)}
        >
          {run.isPending ? "Calculating…" : "Calculate speed effects"}
        </button>
        {run.error && <Failure error={run.error} />}
        {sweep && (
          <>
            <div className="speed-export">
              <p>Selected speed: {sweep.selected.speed_kmh} km/h</p>
              <button
                className="button small"
                onClick={() =>
                  downloadText(
                    "roadsentinel-speed-physics.json",
                    JSON.stringify(sweep, null, 2),
                    "application/json",
                  )
                }
              >
                Export calculation
              </button>
            </div>
            <div
              className="table-scroll"
              role="region"
              aria-label="Speed calculations"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    {[
                      "Speed km/h",
                      "Reaction m",
                      "Braking m",
                      "Stopping m",
                      "Energy kJ",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sweep.curve.map((r) => (
                    <tr key={r.speed_kmh}>
                      <th>{r.speed_kmh}</th>
                      {[
                        r.reaction_distance_m,
                        r.braking_distance_m,
                        r.stopping_distance_m,
                        r.kinetic_energy_kj,
                      ].map((n, i) => (
                        <td key={i}>{n.toFixed(1)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <details className="speed-formulas">
          <summary>Formulas and units</summary>
          <p>
            Speed in m/s = km/h ÷ 3.6. Reaction distance = speed × reaction
            time. Braking distance = speed² ÷ (2 × deceleration). Total stopping
            distance = reaction + braking distance. Kinetic energy in kJ = ½ ×
            mass × speed² ÷ 1,000.
          </p>
        </details>
      </Panel>
    </div>
  );
}
