import { describe, expect, it } from "vitest";
import {
  defaults,
  readSharedScenario,
  scenarioSchema,
  shareScenario,
  inputLabel,
} from "./contracts";
describe("documented scenario contract", () => {
  it("accepts known mph limits, rejects unknown codes, fractions and legacy fields", () => {
    expect(scenarioSchema.safeParse(defaults).success).toBe(true);
    for (const patch of [
      { speed_limit: 100 },
      { speed_limit: 30.5 },
      { weather_conditions: 77 },
      { hour: 24 },
      { Age_of_Driver: 35 },
    ])
      expect(scenarioSchema.safeParse({ ...defaults, ...patch }).success).toBe(
        false,
      );
    expect(
      scenarioSchema.safeParse({ ...defaults, speed_limit: -1 }).success,
    ).toBe(true);
    expect(inputLabel("speed_limit", 30)).toBe("30 mph");
    expect(inputLabel("day_of_week", 1)).toBe("Sunday");
  });
  it("shares only current-schema scenarios", () => {
    expect(
      readSharedScenario(decodeURIComponent(shareScenario(defaults))),
    ).toEqual(defaults);
    expect(readSharedScenario("not-json")).toBeNull();
    expect(readSharedScenario('{"Speed_limit":30}')).toBeNull();
  });
});
