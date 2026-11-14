"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import {
  defaults,
  predictionSchema,
  labels,
  scopeNote,
  performanceNote,
} from "@/lib/contracts";
import { ControlledScenario } from "./ScenarioForm";
import { Failure, Limitation, PageTitle, Panel } from "./ui";
const comparisonSchema = z.object({
  baseline: predictionSchema,
  scenarios: z.array(
    predictionSchema.extend({ feature_differences: z.array(z.string()) }),
  ),
  model_version: z.string(),
  limitation: z.string(),
});
const sweepSchema = z.object({
  speed_unit: z.string(),
  points: z.array(
    z.object({ speed: z.number(), prediction: predictionSchema }),
  ),
});
export default function WhatIf() {
  const [a, setA] = useState(defaults),
    [b, setB] = useState({
      ...defaults,
      speed_limit: 60,
      urban_or_rural_area: 2,
    });
  const comparison = useMutation({
    mutationFn: () =>
      api("predict/whatif", comparisonSchema, {
        method: "POST",
        body: JSON.stringify({ baseline: a, scenarios: [b] }),
      }),
  });
  const sweep = useMutation({
    mutationFn: () =>
      api("predict/speed-sweep", sweepSchema, {
        method: "POST",
        body: JSON.stringify({ scenario: a, start: 20, stop: 70, step: 10 }),
      }),
  });
  const pending = comparison.isPending || sweep.isPending;
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="WORKSPACE / COMPARISON"
        title="Compare road-condition scenarios."
        description="Compare estimated injury severity, conditional on a recorded crash. Changes describe model associations, not the effect of a road intervention."
      />
      <Limitation>{scopeNote}</Limitation>
      <div className="two-columns">
        <Panel
          title="Scenario A"
          subtitle="Baseline, also used for speed exploration"
        >
          <ControlledScenario
            id="scenario-a"
            value={a}
            disabled={pending}
            onChange={(v) => {
              setA(v);
              comparison.reset();
              sweep.reset();
            }}
          />
        </Panel>
        <Panel title="Scenario B" subtitle="Alternative conditions">
          <ControlledScenario
            id="scenario-b"
            value={b}
            disabled={pending}
            onChange={(v) => {
              setB(v);
              comparison.reset();
            }}
          />
        </Panel>
      </div>
      <div className="actions">
        <button
          className="button primary"
          disabled={pending}
          onClick={() => comparison.mutate()}
        >
          {comparison.isPending ? "Comparing…" : "Compare scenarios"}
        </button>
      </div>
      {comparison.error && (
        <Failure error={comparison.error} retry={() => comparison.mutate()} />
      )}
      {comparison.data && (
        <Panel
          title="Comparison results"
          subtitle={`Model ${comparison.data.model_version} · differences in percentage points`}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Injury severity</th>
                  <th>Scenario A</th>
                  <th>Scenario B</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {comparison.data.baseline.probabilities.map((p, i) => {
                  const q = comparison.data!.scenarios[0].probabilities[i];
                  return (
                    <tr key={p.class_id}>
                      <td>{p.label}</td>
                      <td>{(p.probability * 100).toFixed(1)}%</td>
                      <td>{(q.probability * 100).toFixed(1)}%</td>
                      <td>
                        {((q.probability - p.probability) * 100).toFixed(2)} pp
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="chart-annotation">
            Changed inputs:{" "}
            {comparison.data.scenarios[0].feature_differences
              .map((f) => labels[f])
              .join(", ") || "None"}
            .
          </p>
          <Limitation>{comparison.data.limitation}</Limitation>
          <button
            className="button small"
            onClick={() =>
              downloadText(
                "roadsentinel-comparison.json",
                JSON.stringify(comparison.data, null, 2),
                "application/json",
              )
            }
          >
            Export comparison
          </button>
        </Panel>
      )}
      <Panel
        title="Posted speed limit exploration"
        subtitle="Scenario A at the six documented speed limits. This is not a driving-speed simulator."
      >
        <button
          className="button"
          disabled={pending}
          onClick={() => sweep.mutate()}
        >
          {sweep.isPending ? "Evaluating…" : "Explore speed limits"}
        </button>
        {sweep.error && (
          <Failure error={sweep.error} retry={() => sweep.mutate()} />
        )}
        {sweep.data && (
          <>
            <p className="chart-annotation">
              Model {sweep.data.points[0].prediction.model_version}. Other
              inputs remain those of Scenario A. Curves need not be monotonic.
            </p>
            <svg
              className="line-chart"
              viewBox="0 0 720 280"
              role="img"
              aria-label="Estimated injury severity probability by posted speed limit in mph"
            >
              {[0, 25, 50, 75, 100].map((p) => (
                <g key={p}>
                  <line
                    x1="60"
                    y1={240 - p * 2}
                    x2="690"
                    y2={240 - p * 2}
                    stroke="var(--stroke)"
                  />
                  <text x="45" y={244 - p * 2} textAnchor="end" fontSize="10">
                    {p}%
                  </text>
                </g>
              ))}
              {sweep.data.points[0].prediction.probabilities.map((p, index) => (
                <polyline
                  key={p.class_id}
                  points={sweep
                    .data!.points.map(
                      (point, i) =>
                        `${60 + i * 126},${240 - point.prediction.probabilities[index].probability * 200}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={
                    ["var(--blue)", "var(--accent)", "var(--teal)"][index]
                  }
                  strokeWidth="2.5"
                />
              ))}
              {sweep.data.points.map((point, i) => (
                <text
                  key={point.speed}
                  x={60 + i * 126}
                  y="265"
                  textAnchor="middle"
                  fontSize="11"
                >
                  {point.speed} mph
                </text>
              ))}
            </svg>
            <div className="table-scroll">
              <table>
                <caption>Estimated probability by posted speed limit</caption>
                <thead>
                  <tr>
                    <th>Limit (mph)</th>
                    {sweep.data.points[0].prediction.probabilities.map((p) => (
                      <th key={p.class_id}>{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sweep.data.points.map((p) => (
                    <tr key={p.speed}>
                      <td>{p.speed}</td>
                      {p.prediction.probabilities.map((q) => (
                        <td key={q.class_id}>
                          {(q.probability * 100).toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="button small"
              onClick={() =>
                downloadText(
                  "roadsentinel-speed-limits.json",
                  JSON.stringify(sweep.data, null, 2),
                  "application/json",
                )
              }
            >
              Export speed exploration
            </button>
          </>
        )}
      </Panel>
      <Limitation>{performanceNote}</Limitation>
    </div>
  );
}
