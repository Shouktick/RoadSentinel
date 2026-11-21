import { describe, expect, it } from "vitest";
import { gpsReader } from "./ride-gps";
function point(at: number, speed: number | null, longitude = 77, accuracy = 4) {
  return {
    timestamp: at,
    coords: { latitude: 13, longitude, accuracy, speed },
  } as GeolocationPosition;
}
describe("passenger GPS", () => {
  it("converts native speed, preserves stationary zero, rejects noisy and old fixes", () => {
    const read = gpsReader();
    expect(read(point(10000, 20), 10000)?.reading?.kmh).toBe(72);
    expect(read(point(11000, 0), 11000)?.reading?.kmh).toBe(0);
    expect(read(point(12000, 10, 77, 150), 12000)?.reading).toBeNull();
    expect(read(point(11000, 25), 12000)).toBeNull();
    expect(read(point(13000, 25), 30000)).toBeNull();
  });
  it("estimates from sufficiently separated fixes, excluding drift and jumps", () => {
    const read = gpsReader();
    expect(read(point(10000, null), 10000)?.reading).toBeNull();
    expect(read(point(11000, null, 77.00002), 11000)?.reading).toBeNull();
    expect(read(point(12500, null, 77.00002), 12500)?.reading).toBeNull();
    const estimate = read(point(15000, null, 77.0005), 15000)?.reading;
    expect(estimate?.source).toBe("Estimated from movement");
    expect(estimate?.kmh).toBeCloseTo(39, 0);
    expect(read(point(18000, null, 78), 18000)?.reading).toBeNull();
  });
});
