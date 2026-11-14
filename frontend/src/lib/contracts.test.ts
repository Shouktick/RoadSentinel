import { expect, it } from "vitest";
import {
  aggregateCsv,
  formatCount,
  healthSchema,
  indiaSchema,
} from "./contracts";
it("preserves missing values and explicit India units/version in exports", () => {
  const csv = aggregateCsv(
    [
      {
        state: "Lakshadweep",
        year: 2023,
        accidents: 1,
        fatalities: null,
        injuries: 1,
        source_missing: { fatalities: "-" },
      },
    ],
    "india-morth-2023-v1",
    "https://morth.gov.in",
  );
  expect(csv).toContain('"India","india-morth-2023-v1"');
  expect(csv).toContain('"persons_killed_count"');
  expect(csv).toContain('"2023","1","","1"');
  expect(formatCount(null)).toBe("Not reported (source dash)");
  expect(formatCount(0)).toBe("0");
});
it("rejects a foreign dataset or serving model contract", () => {
  expect(indiaSchema.safeParse({ country: "Great Britain" }).success).toBe(
    false,
  );
  expect(
    healthSchema.safeParse({ country: "India", model_available: true }).success,
  ).toBe(false);
});
