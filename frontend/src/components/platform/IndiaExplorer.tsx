"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { GeoJsonObject } from "geojson";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, downloadText } from "@/lib/api";
import {
  aggregateCsv,
  formatCount,
  indiaSchema,
  Metric,
  metricLabels,
} from "@/lib/contracts";
import { Failure, Limitation, Loading, PageTitle, Panel, Stat } from "./ui";

const Map = dynamic(() => import("./GeographicMap"), {
  ssr: false,
  loading: () => <Loading message="Loading India regional map…" />,
});
const geographySchema = z.object({
  country: z.literal("India"),
  dataset_version: z.string(),
  kind: z.literal("state_ut_boundaries"),
  geojson: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(z.unknown()),
  }),
});

export default function IndiaExplorer({
  mode,
}: {
  mode: "overview" | "analytics" | "map";
}) {
  const [year, setYear] = useState(2023),
    [state, setState] = useState("All India"),
    [metric, setMetric] = useState<Metric>("accidents");
  const data = useQuery({
    queryKey: ["india-aggregates"],
    queryFn: () => api("insights/overview", indiaSchema),
  });
  const geo = useQuery({
    queryKey: ["india-geography"],
    queryFn: () => api("hotspots", geographySchema),
    enabled: mode === "map",
  });
  const source = data.data;
  const names = source
    ? [...new Set(source.records.map((r) => r.state))].sort()
    : [];
  const rows =
    source?.records.filter(
      (r) => r.year === year && (state === "All India" || r.state === state),
    ) ?? [];
  const current =
    state === "All India"
      ? source?.national.find((r) => r.year === year)
      : rows[0];
  const trend =
    state === "All India"
      ? source?.national
      : source?.records.filter((r) => r.state === state);
  const ranking = [...rows].sort(
    (a, b) => (b[metric] ?? -1) - (a[metric] ?? -1),
  );
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow={`INDIA / ${mode === "map" ? "REGIONAL MAP" : mode === "analytics" ? "ANALYTICS" : "OVERVIEW"}`}
        title={
          mode === "map"
            ? "India, state by state."
            : mode === "analytics"
              ? "Understand the reported counts."
              : "India’s road accident picture."
        }
        description="Official MoRTH statistics for 2021–2023 · 36 states and union territories · reported accidents and people affected"
      />
      <Limitation>
        Aggregate statistics describe reported events. They do not predict
        individual injury severity or the chance of a crash.{" "}
        <Link href="/predict">Severity prediction is unavailable.</Link>
      </Limitation>
      {data.isPending ? (
        <Loading />
      ) : data.error ? (
        <Failure error={data.error} retry={() => void data.refetch()} />
      ) : (
        source && (
          <>
            <Panel
              title="Choose a region and year"
              subtitle={`India · ${source.dataset_version}`}
            >
              <div className="filters">
                <div className="field">
                  <label htmlFor="india-year">Calendar year</label>
                  <select
                    id="india-year"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {source.years.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="india-state">State or union territory</label>
                  <select
                    id="india-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option>All India</option>
                    {names.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="india-metric">Measure</label>
                  <select
                    id="india-metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as Metric)}
                  >
                    {Object.entries(metricLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Panel>
            {current && (
              <div className="stats-grid">
                {(Object.keys(metricLabels) as Metric[]).map((k) => (
                  <Stat
                    key={k}
                    label={metricLabels[k]}
                    value={formatCount(current[k])}
                    note={`${state} · ${year} · ${k === "accidents" ? "events" : "people"}`}
                  />
                ))}
              </div>
            )}
            {mode === "map" && (
              <Panel
                title={`${metricLabels[metric]} by state/UT · ${year}`}
                subtitle="Regional totals shaded on boundaries; these are not crash locations or risk rates."
              >
                {geo.isPending ? (
                  <Loading />
                ) : geo.error ? (
                  <Failure error={geo.error} retry={() => void geo.refetch()} />
                ) : geo.data &&
                  geo.data.dataset_version === source.dataset_version ? (
                  <>
                    <div className="india-map">
                      <Map
                        geometry={geo.data.geojson as GeoJsonObject}
                        records={source.records.filter((r) => r.year === year)}
                        metric={metric}
                        year={year}
                        onSelect={setState}
                      />
                    </div>
                    <p className="chart-annotation">
                      Shade increases with the count within the selected year.
                      Grey means not reported. Use the state selector or
                      accessible table below for small territories.
                    </p>
                    <p className="chart-annotation">{source.geography.note}</p>
                    <p className="chart-annotation">
                      Boundaries:{" "}
                      <a href={source.geography.license_url}>
                        geoBoundaries / DataMeet India
                      </a>{" "}
                      · {source.geography.license}. No basemap or foreign
                      accident points are loaded.
                    </p>
                  </>
                ) : (
                  <Limitation>
                    Map and statistics versions do not match. Refresh after
                    deployment.
                  </Limitation>
                )}
              </Panel>
            )}
            <div className="two-columns">
              <Panel
                title={`${state}: three-year comparison`}
                subtitle={`${metricLabels[metric]} · ${source.units[metric]} · ${source.dataset_version}`}
              >
                <div style={{ height: 270, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="year" />
                      <YAxis
                        width={75}
                        tickFormatter={(v) => Number(v).toLocaleString("en-IN")}
                      />
                      <Tooltip
                        formatter={(v) => [
                          formatCount(Number(v)),
                          metricLabels[metric],
                        ]}
                      />
                      <Bar
                        dataKey={metric}
                        fill="#62b6a8"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table>
                  <caption className="sr-only">
                    Accessible annual counts
                  </caption>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>{metricLabels[metric]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend?.map((r) => (
                      <tr key={r.year}>
                        <td>{r.year}</td>
                        <td>{formatCount(r[metric])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              <Panel
                title="Read the numbers correctly"
                subtitle="Events and people are different units"
              >
                <p>{source.definitions[metric]}</p>
                <p>
                  Several people may be killed or injured in one accident. These
                  columns cannot be used as crash-level severity labels.
                </p>
                <p>
                  Counts have no population, traffic-volume or distance
                  denominator. A ranking of totals is not a ranking of driving
                  safety.
                </p>
                <p>
                  A source dash remains missing. It is not silently replaced by
                  zero; national figures are the separately published totals.
                </p>
                <div className="actions">
                  <Link className="button small" href="/model-card">
                    Data & model status
                  </Link>
                  {mode !== "map" && (
                    <Link className="button small" href="/map">
                      Explore regional map
                    </Link>
                  )}
                </div>
              </Panel>
            </div>
            <Panel
              title={`${state === "All India" ? "State and union territory" : state} counts · ${year}`}
              subtitle={`Sorted by ${metricLabels[metric].toLowerCase()} · ${rows.length} aggregate rows · ${source.dataset_version}`}
              action={
                <button
                  className="button small"
                  onClick={() =>
                    downloadText(
                      `roadsentinel-india-${year}.csv`,
                      aggregateCsv(
                        ranking,
                        source.dataset_version,
                        source.source_url,
                      ),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Export selected CSV
                </button>
              }
            >
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable state and union territory statistics"
              >
                <table>
                  <caption className="sr-only">
                    Indian state and union territory accident statistics
                  </caption>
                  <thead>
                    <tr>
                      <th>State / UT</th>
                      <th>Reported accidents</th>
                      <th>Persons killed</th>
                      <th>Persons injured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r) => (
                      <tr key={r.state}>
                        <th scope="row">{r.state}</th>
                        <td>{formatCount(r.accidents)}</td>
                        <td>{formatCount(r.fatalities)}</td>
                        <td>{formatCount(r.injuries)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Source, coverage and reuse">
              <p>
                <a href={source.source_url}>{source.source}</a>. Tables:
                Annexures 2–4, printed pages 112, 114 and 116. This is a pinned
                historical release, not live incident data.
              </p>
              <p>
                {source.license}.{" "}
                <a href={source.license_url}>Read the reuse policy</a>.
              </p>
              <p className="chart-annotation india-hash">
                Dataset {source.dataset_version} · source SHA256{" "}
                {source.source_sha256}
              </p>
              <details>
                <summary>Coverage and data-quality notes</summary>
                {source.notes.map((n) => (
                  <p key={n}>{n}</p>
                ))}
              </details>
            </Panel>
          </>
        )
      )}
    </div>
  );
}
