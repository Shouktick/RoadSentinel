"use client";
import { GeoJSON, MapContainer } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { formatCount, IndiaRow, Metric, metricLabels } from "@/lib/contracts";
import "leaflet/dist/leaflet.css";
export default function GeographicMap({
  geometry,
  records,
  metric,
  year,
  onSelect,
}: {
  geometry: GeoJsonObject;
  records: IndiaRow[];
  metric: Metric;
  year: number;
  onSelect: (state: string) => void;
}) {
  const lookup = new Map(records.map((r) => [r.state, r]));
  const max = Math.max(...records.map((r) => r[metric] ?? 0), 1);
  return (
    <MapContainer
      center={[23, 81]}
      zoom={4}
      minZoom={3}
      maxZoom={8}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", background: "#e5edf0" }}
      attributionControl={true}
    >
      <GeoJSON
        key={`${year}-${metric}`}
        data={geometry}
        attribution='Boundaries: <a href="https://www.geoboundaries.org/">geoBoundaries</a> / DataMeet India'
        style={(f) => {
          const v = lookup.get(f?.properties.state)?.[metric];
          return {
            color: "#34536a",
            weight: 0.7,
            fillColor:
              v == null ? "#92999e" : `hsl(165, 45%, ${88 - (55 * v) / max}%)`,
            fillOpacity: 0.9,
          };
        }}
        onEachFeature={(feature, layer) => {
          const state = String(feature.properties.state),
            row = lookup.get(state);
          const el = document.createElement("div");
          el.textContent = `${state} | ${year}: ${row ? formatCount(row[metric]) : "Not reported"} ${metricLabels[metric].toLowerCase()}. State/UT aggregate, not a crash location.`;
          layer.bindPopup(el);
          layer.on("click", () => onSelect(state));
        }}
      />
    </MapContainer>
  );
}
