"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import type { RideFix } from "@/lib/ride-gps";

const ring = z.array(z.array(z.number()));
const geometry = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: z.array(ring) }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(ring)),
  }),
]);
const shape = z.object({
  geojson: z.object({
    features: z.array(
      z.object({ properties: z.object({ state: z.string() }), geometry }),
    ),
  }),
});
function inside(ring: number[][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i],
      [c, d] = ring[j];
    if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a) hit = !hit;
  }
  return hit;
}
export default function JourneyContext({ fix }: { fix: RideFix["fix"] }) {
  const geo = useQuery({
    queryKey: ["ride-boundaries"],
    queryFn: () => api("hotspots", shape),
    enabled: !!fix,
    staleTime: Infinity,
  });
  const area = useMemo(() => {
    if (!fix || !geo.data) return null;
    return geo.data.geojson.features.find(({ geometry: g }) => {
      const polygons = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      return polygons.some(
        ([outer, ...holes]) =>
          inside(outer, fix.longitude, fix.latitude) &&
          !holes.some((h) => inside(h, fix.longitude, fix.latitude)),
      );
    })?.properties.state;
  }, [fix, geo.data]);
  const grid = fix
    ? new URLSearchParams({
        lat: String(Math.round(fix.latitude * 10)),
        lon: String(Math.round(fix.longitude * 10)),
      }).toString()
    : null;
  const [requested, setRequested] = useState<string | null>(null);
  const forecast = useQuery({
    queryKey: ["ride-weather", grid],
    enabled: !!grid && requested === grid,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const r = await fetch("/api/ride-weather?" + grid, { signal });
      if (!r.ok) throw new Error();
      return z
        .object({
          at: z.string(),
          celsius: z.number(),
          rainMm: z.number().nullable(),
        })
        .parse(await r.json());
    },
  });
  const weather = requested === grid ? forecast.data : null;
  return (
    <details className="ride-detail">
      <summary>Area & weather</summary>
      <p>
        Approximate area:{" "}
        {area ?? (fix && geo.isFetching ? "Looking up region…" : "Unavailable")}
        . Boundaries from geoBoundaries / DataMeet India.
      </p>
      <p>
        Load an hourly forecast using your location rounded to 0.1°.
        RoadSentinel sends this area to MET Norway.
      </p>
      <button
        className="button"
        disabled={!grid || forecast.isFetching}
        onClick={() => {
          if (requested === grid) void forecast.refetch();
          else setRequested(grid);
        }}
      >
        {forecast.isFetching ? "Loading forecast…" : "Load area weather"}
      </button>
      {forecast.error && (
        <p role="status">
          Area forecast unavailable. You can still record the weather you see.
        </p>
      )}
      {weather && (
        <p>
          {weather.celsius} °C
          {weather.rainMm !== null &&
            ` · ${weather.rainMm} mm precipitation forecast over one hour`}{" "}
          · {new Date(weather.at).toLocaleString()} ·{" "}
          <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation">
            MET Norway
          </a>{" "}
          · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
        </p>
      )}
    </details>
  );
}
