"use client";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { Failure, Limitation, Loading, PageTitle, Panel } from "./ui";
const Map = dynamic(() => import("./GeographicMap"), {
  ssr: false,
  loading: () => <Loading message="Loading map…" />,
});
const schema = z.object({
  model_version: z.string(),
  provenance: z.object({ source: z.string(), sha256: z.string() }),
  total: z.number(),
  valid_coordinates: z.number(),
  displayed_records: z.number(),
  cell_degrees: z.number(),
  minimum_cell_count: z.number(),
  items: z.array(
    z.object({ lat: z.number(), lng: z.number(), count: z.number() }),
  ),
});
export default function HotspotWorkspace() {
  const data = useQuery({
    queryKey: ["geography"],
    queryFn: () => api("hotspots", schema),
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INTELLIGENCE / GREAT BRITAIN MAP"
        title="Where crashes were recorded."
        description="Aggregated source coordinates from Great Britain's 2023 police-recorded injury crashes."
      />
      <Limitation>
        Each circle represents a 0.1° latitude × longitude cell, not an
        individual crash location. Cells with fewer than five crashes are
        omitted. Counts reflect reporting and traffic volumes; they are not road
        safety scores.
      </Limitation>
      <Panel
        title="Great Britain observations"
        subtitle="England, Scotland and Wales · no India coverage"
      >
        {data.isPending ? (
          <Loading />
        ) : data.error ? (
          <Failure error={data.error} retry={() => void data.refetch()} />
        ) : (
          data.data && (
            <>
              <p className="chart-annotation">
                {data.data.displayed_records.toLocaleString()} crashes in{" "}
                {data.data.items.length.toLocaleString()} displayed cells;{" "}
                {data.data.valid_coordinates.toLocaleString()} records with
                usable coordinates out of {data.data.total.toLocaleString()}.
                Model {data.data.model_version}.
              </p>
              <div className="map-frame">
                <Map points={data.data.items} />
              </div>
              <p className="chart-annotation">
                Circle size shows the number of recorded crashes. Markers are
                cell centres calculated from actual source coordinates. Basemap
                © OpenStreetMap contributors; tiles require internet access.
              </p>
              <details className="details-panel">
                <summary>Accessible table of map cells</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cell centre latitude</th>
                        <th>Cell centre longitude</th>
                        <th>Recorded crashes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.items.map((p) => (
                        <tr key={`${p.lat}:${p.lng}`}>
                          <td>{p.lat}</td>
                          <td>{p.lng}</td>
                          <td>{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <button
                className="button small"
                onClick={() =>
                  downloadText(
                    "roadsentinel-gb-map-cells.json",
                    JSON.stringify(data.data, null, 2),
                    "application/json",
                  )
                }
              >
                Export map cells
              </button>
              <p className="chart-annotation">
                Source: {data.data.provenance.source}. SHA256:{" "}
                {data.data.provenance.sha256}
              </p>
            </>
          )
        )}
      </Panel>
    </div>
  );
}
