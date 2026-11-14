import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CurrentResult } from "./KarnatakaWorkspace";
import PredictionResult from "./PredictionResult";
it("shows research scores without a personal-risk claim", () => {
  render(
    <CurrentResult
      result={{
        id: "fixture",
        created_at: "2026-01-01",
        model_version: "india-karnataka-test",
        source_country: "India",
        region: "Karnataka",
        historical_only: false,
        scenario: {},
        severity: "Fatal",
        confidence: 0.4,
        probabilities: [
          { class_id: "Fatal", label: "Fatal", probability: 0.4 },
        ],
      }}
    />,
  );
  expect(
    screen.getByText(/not calibrated personal probabilities/),
  ).toBeVisible();
  expect(
    screen.getByRole("progressbar", { name: "Fatal model score" }),
  ).toHaveAttribute("value", "0.4");
});
it("keeps archived foreign results explicit and cannot rerun or relabel", () => {
  render(
    <PredictionResult
      prediction={{
        id: "old",
        created_at: "2026-01-01",
        model_version: "stats19-gb-2022-v1",
        source_country: "Great Britain",
        historical_only: true,
        scenario: { speed_limit: 30 },
        severity: "Slight injury",
        confidence: 0.7,
        speed_unit: "mph",
        probabilities: [
          { class_id: "3", label: "Slight injury", probability: 0.7 },
        ],
      }}
    />,
  );
  expect(screen.getByText(/not an Indian estimate/)).toBeVisible();
  expect(screen.getByText(/Original speed unit: mph/)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /share|rerun|predict/i }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Export original record" }),
  ).toBeVisible();
});
