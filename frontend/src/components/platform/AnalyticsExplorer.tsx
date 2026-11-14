"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { Failure, Limitation, Loading, PageTitle, Panel, Stat } from "./ui";
const provenance = z.object({
  source: z.string(),
  sha256: z.string(),
  record_count: z.number(),
});
const overviewSchema = z.object({
  provenance,
  model_version: z.string(),
  row_count: z.number(),
  distribution: z.array(z.object({ label: z.string(), count: z.number() })),
  missing_values: z.number(),
  duplicate_rows: z.number(),
});
const aggregateSchema = z.object({
  provenance,
  model_version: z.string(),
  denominator: z.number(),
  dimension: z.string(),
  items: z.array(
    z.object({ group: z.string(), label: z.string(), count: z.number() }),
  ),
});
const dimensions = [
  ["weather", "Weather"],
  ["road-surface", "Road surface"],
  ["lighting", "Lighting"],
  ["road-type", "Road type"],
  ["area-type", "Area type"],
  ["speed-bands", "Posted limit"],
  ["hourly", "Local hour"],
  ["weekday", "Weekday"],
];
export default function AnalyticsExplorer() {
  const [dimension, setDimension] = useState("weather");
  const overview = useQuery({
    queryKey: ["dataset-overview"],
    queryFn: () => api("insights/overview", overviewSchema),
  });
  const aggregate = useQuery({
    queryKey: ["aggregate", dimension],
    queryFn: () => api(`insights/${dimension}`, aggregateSchema),
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INTELLIGENCE / SOURCE DATA"
        title="Great Britain collision observations."
        description="Police-recorded injury crashes in 2023. These source counts are separate from predictions and your application activity."
      />
      <Limitation>
        Counts do not measure danger per journey: traffic exposure is not
        included, and non-fatal crashes are under-reported. The outcomes
        describe the most severe injury in each crash.
      </Limitation>
      {overview.isPending ? (
        <Loading />
      ) : overview.error ? (
        <Failure error={overview.error} retry={() => void overview.refetch()} />
      ) : (
        overview.data && (
          <>
            <div className="stats-grid">
              <Stat
                label="Recorded crashes"
                value={overview.data.row_count.toLocaleString()}
                note="Great Britain · 2023"
              />
              <Stat
                label="Missing inputs"
                value={overview.data.missing_values.toLocaleString()}
                note="Missing or out-of-range model input cells"
              />
              <Stat
                label="Duplicate records"
                value={String(overview.data.duplicate_rows)}
                note="Exact source row duplicates"
              />
              <Stat
                label="Source SHA256"
                value={overview.data.provenance.sha256.slice(0, 8)}
                note="Pinned download fingerprint"
              />
            </div>
            <Panel title="Recorded injury severity">
              <div className="distribution">
                {overview.data.distribution.map((p) => (
                  <div key={p.label}>
                    <div className="bar-label">
                      <span>{p.label}</span>
                      <strong>
                        {p.count.toLocaleString()} (
                        {((p.count / overview.data!.row_count) * 100).toFixed(
                          1,
                        )}
                        %)
                      </strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(p.count / overview.data!.row_count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )
      )}
      <Panel title="Explore recorded conditions">
        <div className="segmented">
          {dimensions.map(([id, name]) => (
            <button
              key={id}
              aria-pressed={dimension === id}
              onClick={() => setDimension(id)}
            >
              {name}
            </button>
          ))}
        </div>
        {aggregate.isPending ? (
          <Loading />
        ) : aggregate.error ? (
          <Failure
            error={aggregate.error}
            retry={() => void aggregate.refetch()}
          />
        ) : (
          aggregate.data && (
            <>
              <p className="chart-annotation">
                {aggregate.data.provenance.source} ·{" "}
                {aggregate.data.denominator.toLocaleString()} records · Model{" "}
                {aggregate.data.model_version}
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Most severe injury</th>
                      <th>Crashes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregate.data.items.map((p) => (
                      <tr key={`${p.group}-${p.label}`}>
                        <td>{p.group}</td>
                        <td>{p.label}</td>
                        <td>{p.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="button small"
                onClick={() =>
                  downloadText(
                    "roadsentinel-analytics.json",
                    JSON.stringify(aggregate.data, null, 2),
                    "application/json",
                  )
                }
              >
                Export aggregate
              </button>
            </>
          )
        )}
      </Panel>
    </div>
  );
}
