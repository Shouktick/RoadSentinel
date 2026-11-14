"use client";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
export default function GeographicMap({
  points,
}: {
  points: { lat: number; lng: number; count: number }[];
}) {
  return (
    <MapContainer
      center={[54, -2]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {points.map((p) => (
        <CircleMarker
          key={`${p.lat}:${p.lng}`}
          center={[p.lat, p.lng]}
          radius={Math.min(16, 3 + Math.log2(p.count))}
          pathOptions={{ color: "#3676ad", fillOpacity: 0.35, weight: 1 }}
        >
          <Popup>
            <strong>{p.count} recorded crashes</strong>
            <br />
            0.1° cell centred at {p.lat}, {p.lng}
            <br />
            Great Britain, 2023. This marker is not a crash location.
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
