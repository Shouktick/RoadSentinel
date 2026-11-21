import { NextRequest } from "next/server";

type ForecastHour = {
  time: string;
  data: {
    instant: { details: { air_temperature?: number } };
    next_1_hours?: { details: { precipitation_amount?: number } };
  };
};
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = params.get("lat"),
    lon = params.get("lon");
  // Accept only coarse grid indices. This endpoint never needs a precise GPS fix.
  if (
    !lat ||
    !lon ||
    !/^-?\d{1,3}$/.test(lat) ||
    !/^-?\d{1,4}$/.test(lon) ||
    Math.abs(+lat) > 900 ||
    Math.abs(+lon) > 1800
  )
    return Response.json({ error: "Invalid weather grid." }, { status: 400 });
  try {
    const response = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${Number(lat) / 10}&lon=${Number(lon) / 10}`,
      {
        headers: {
          "User-Agent": "RoadSentinel/1.0 github.com/Shouktick/RoadSentinel",
        },
        next: { revalidate: 10800 },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error();
    const hours: ForecastHour[] = (await response.json()).properties.timeseries;
    const now = Date.now();
    const hour = hours.find(
      (h) => Date.parse(h.time) <= now && now - Date.parse(h.time) < 3600000,
    );
    const celsius = hour?.data.instant.details.air_temperature;
    if (!hour || !Number.isFinite(celsius)) throw new Error();
    return Response.json({
      at: hour.time,
      celsius,
      rainMm: hour.data.next_1_hours?.details.precipitation_amount ?? null,
    });
  } catch {
    return Response.json(
      { error: "Area forecast unavailable." },
      { status: 503 },
    );
  }
}
