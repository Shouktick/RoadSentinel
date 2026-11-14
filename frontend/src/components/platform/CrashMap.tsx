"use client";
import { MapContainer, Rectangle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
export type Cell = {
  bounds: [[number, number], [number, number]];
  count: number;
  fatal: number;
};
export default function CrashMap({ cells }: { cells: Cell[] }) {
  const max = Math.max(...cells.map((c) => c.count), 1);
  return (
    <MapContainer
      center={[15, 76.2]}
      zoom={6}
      minZoom={5}
      maxZoom={10}
      scrollWheelZoom={false}
      style={{ height: 480, width: "100%", background: "#e5edf0" }}
    >
      {cells.map((c, i) => (
        <Rectangle
          key={i}
          bounds={c.bounds}
          pathOptions={{
            color: "#34536a",
            weight: 0.5,
            fillColor: `hsl(165,45%,${88 - (55 * c.count) / max}%)`,
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            {c.count.toLocaleString("en-IN")} retained crash records, including{" "}
            {c.fatal.toLocaleString("en-IN")} recorded fatal crashes. 2016-2023.
            Grid cell, not a point location or exposure-adjusted risk.
          </Popup>
        </Rectangle>
      ))}
    </MapContainer>
  );
}
