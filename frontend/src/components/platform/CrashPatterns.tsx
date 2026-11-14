"use client";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { Failure, Limitation, Loading, PageTitle, Panel } from "./ui";
const Map = dynamic(() => import("./CrashMap"), {
  ssr: false,
  loading: () => <Loading message="Loading crash grid..." />,
});
const schema = z.object({
  country: z.literal("India"),
  region: z.literal("Karnataka"),
  dataset_version: z.string(),
  source_url: z.string(),
  attribution: z.string(),
  license: z.string(),
  license_url: z.string(),
  modifications: z.string(),
  scope: z.string(),
  records: z.number(),
  years: z.record(z.string(), z.number()),
  classes: z.record(z.string(), z.number()),
  districts: z.array(z.object({ district: z.string(), count: z.number() })),
  geography: z.object({
    coordinate_records_inside_boundary: z.number(),
    minimum_cell_count: z.number(),
    cell_size_degrees: z.number(),
    note: z.string(),
  }),
  cells: z.array(
    z.object({
      bounds: z.tuple([
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number()]),
      ]),
      count: z.number(),
      fatal: z.number(),
    }),
  ),
});
export default function CrashPatterns() {
  const q = useQuery({
    queryKey: ["crash-patterns"],
    queryFn: () => api("insights/crashes", schema),
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INDIA / CRASH PATTERNS"
        title="Explore the recorded patterns."
        description="Karnataka crash-record coverage, recorded outcomes and geographic concentration."
      />
      <Limitation>
        This filtered research sample is separate from official national totals.
        Counts do not measure your chance of crashing or prove one district is
        safer.
      </Limitation>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <Failure error={q.error} retry={() => void q.refetch()} />
      ) : (
        q.data && (
          <>
            <Panel title="Observed sample" subtitle={q.data.scope}>
              <p>
                {q.data.attribution}.{" "}
                <a href={q.data.source_url}>Source publication</a> ·{" "}
                <a href={q.data.license_url}>{q.data.license}</a>{" "}
                (noncommercial).
              </p>
              <p>
                {q.data.records.toLocaleString("en-IN")} retained crash records
                | {q.data.dataset_version}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Recorded outcome</th>
                    <th>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(q.data.classes).map(([c, n]) => (
                    <tr key={c}>
                      <th>{c}</th>
                      <td>{n.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <Panel
              title="Crash concentration grid"
              subtitle={q.data.geography.note}
            >
              <Map cells={q.data.cells} />
              <p>
                Shading increases with the number of retained records.{" "}
                {q.data.geography.coordinate_records_inside_boundary.toLocaleString(
                  "en-IN",
                )}{" "}
                records have coordinates inside the illustrative Karnataka
                boundary; low-count cells are omitted. No basemap or invented
                crash points are used.
              </p>
            </Panel>
            <Panel
              title="Police district / unit coverage"
              action={
                <button
                  className="button small"
                  onClick={() =>
                    downloadText(
                      "roadsentinel-karnataka-patterns.json",
                      JSON.stringify(q.data, null, 2),
                      "application/json",
                    )
                  }
                >
                  Export aggregate patterns
                </button>
              }
            >
              <div
                className="table-scroll"
                role="region"
                aria-label="District sample counts"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Police district / unit</th>
                      <th>Retained records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.districts.map((r) => (
                      <tr key={r.district}>
                        <th>{r.district}</th>
                        <td>{r.count.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )
      )}
    </div>
  );
}
