export const freshnessMs = 15000;

type Fix = {
  latitude: number;
  longitude: number;
  accuracy: number;
  at: number;
};
export type Reading = {
  kmh: number;
  source: "Phone GPS" | "Estimated from movement";
  at: number;
};
export type RideFix = {
  fix: Fix | null;
  reading: Reading | null;
  message: string;
  awaitingMovement?: boolean;
};

function distanceMetres(a: Fix, b: Fix) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Keep one reference point locally while waiting for movement larger than position uncertainty.
export function gpsReader() {
  let anchor: Fix | null = null;
  let latest = 0;
  return (position: GeolocationPosition, now: number): RideFix | null => {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const at = position.timestamp;
    if (
      !Number.isFinite(at) ||
      at <= latest ||
      at > now + 1000 ||
      now - at >= freshnessMs
    )
      return null;
    latest = at;
    if (
      ![latitude, longitude, accuracy].every(Number.isFinite) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      accuracy < 0 ||
      accuracy > 50
    ) {
      anchor = null;
      return {
        fix: null,
        reading: null,
        message: "Weak location signal. Waiting for a clearer reading.",
      };
    }
    const fix = { latitude, longitude, accuracy, at };
    if (speed !== null && Number.isFinite(speed) && speed >= 0) {
      anchor = fix;
      return {
        fix,
        reading: { kmh: speed * 3.6, source: "Phone GPS", at },
        message: "Receiving phone speed",
      };
    }
    const previous = anchor;
    const seconds = previous ? (at - previous.at) / 1000 : 0;
    if (!previous || seconds >= freshnessMs / 1000) anchor = fix;
    else if (seconds >= 2) {
      const distance = distanceMetres(previous, fix);
      // Treat a jump exceeding 100 metres per second as an unreliable road-position pair.
      if (distance / seconds > 100) {
        anchor = fix;
        return {
          fix,
          reading: null,
          message: "GPS position jumped. Waiting for another reading.",
        };
      }
      if (distance > Math.max(5, previous.accuracy + accuracy)) {
        anchor = fix;
        return {
          fix,
          reading: {
            kmh: (distance / seconds) * 3.6,
            source: "Estimated from movement",
            at,
          },
          message: "Speed estimated between two locations",
        };
      }
    }
    return {
      fix,
      reading: null,
      awaitingMovement: true,
      message: "Waiting for enough movement to estimate speed.",
    };
  };
}
