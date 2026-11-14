"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { Failure, Limitation, Loading, PageTitle, Panel } from "./ui";
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
  const [inputs, setInputs] = useState({
    speed_kmh: 50,
    reaction_seconds: 1.5,
    deceleration_ms2: 5,
    mass_kg: 1500,
  });
  const run = useMutation({
    mutationFn: () =>
      api("predict/speed-sweep", schema, {
        method: "POST",
        body: JSON.stringify(inputs),
      }),
  });
  const fields: [keyof typeof inputs, string, number, number, number][] = [
    ["speed_kmh", "Speed (km/h)", 5, 150, 1],
    ["reaction_seconds", "Assumed reaction time (seconds)", 0.5, 5, 0.1],
    ["deceleration_ms2", "Assumed constant deceleration (m/s²)", 1, 10, 0.1],
    ["mass_kg", "Vehicle mass (kg)", 50, 40000, 50],
  ];
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INDIA / SPEED EXPLORER"
        title="See the physics of speed."
        description="Explore reaction distance, braking distance and kinetic energy with explicit assumptions."
      />
      <Limitation>
        The crash dataset contains no measured speed. This calculator is
        separate from the severity model and does not estimate injury
        probability or recommend a safe speed.
      </Limitation>
      <Panel title="Set the assumptions">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate();
          }}
        >
          <fieldset className="scenario-fieldset" disabled={run.isPending}>
            <div className="india-filter-grid">
              {fields.map(([key, label, min, max, step]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    required
                    value={Number.isNaN(inputs[key]) ? "" : inputs[key]}
                    onChange={(e) => {
                      setInputs({ ...inputs, [key]: e.target.valueAsNumber });
                      run.reset();
                    }}
                  />
                </div>
              ))}
            </div>
            <button className="button primary" type="submit">
              Calculate speed effects
            </button>
          </fieldset>
        </form>
        {run.isPending && <Loading />}
        {run.error && <Failure error={run.error} />}
      </Panel>
      {run.data && (
        <>
          <Panel title={`At ${run.data.selected.speed_kmh} km/h`}>
            <div className="india-stat-grid">
              <div className="stat-card">
                <span>Reaction distance</span>
                <strong>
                  {run.data.selected.reaction_distance_m.toFixed(1)} m
                </strong>
              </div>
              <div className="stat-card">
                <span>Braking distance</span>
                <strong>
                  {run.data.selected.braking_distance_m.toFixed(1)} m
                </strong>
              </div>
              <div className="stat-card">
                <span>Total stopping distance</span>
                <strong>
                  {run.data.selected.stopping_distance_m.toFixed(1)} m
                </strong>
              </div>
            </div>
            <p>{run.data.explanation}</p>
            <p>
              Kinetic energy: {run.data.selected.kinetic_energy_kj.toFixed(1)}{" "}
              kJ. Doubling speed quadruples kinetic energy for the same mass.
            </p>
          </Panel>
          <Panel
            title="Speed sweep"
            subtitle="Fixed assumptions from your calculation; distances in metres."
            action={
              <button
                className="button small"
                onClick={() =>
                  downloadText(
                    "roadsentinel-speed-physics.json",
                    JSON.stringify(run.data, null, 2),
                    "application/json",
                  )
                }
              >
                Export calculation
              </button>
            }
          >
            <div
              className="table-scroll"
              role="region"
              aria-label="Speed calculations"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Speed km/h</th>
                    <th>Reaction m</th>
                    <th>Braking m</th>
                    <th>Stopping m</th>
                    <th>Energy kJ</th>
                  </tr>
                </thead>
                <tbody>
                  {run.data.curve.map((r) => (
                    <tr key={r.speed_kmh}>
                      <th>{r.speed_kmh}</th>
                      <td>{r.reaction_distance_m.toFixed(1)}</td>
                      <td>{r.braking_distance_m.toFixed(1)}</td>
                      <td>{r.stopping_distance_m.toFixed(1)}</td>
                      <td>{r.kinetic_energy_kj.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="chart-annotation">
              v = km/h ÷ 3.6; reaction = v × time; braking = v² ÷ (2 ×
              deceleration); energy = ½ × mass × v². Constant deceleration and
              level ground are idealizations.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
