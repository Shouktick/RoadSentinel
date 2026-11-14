import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import PredictionUnavailable from "./PredictionUnavailable";
import PredictionResult from "./PredictionResult";
it("offers supported analytics without prediction inputs or run buttons", () => {
  render(<PredictionUnavailable />);
  expect(
    screen.getByRole("heading", {
      name: "Severity prediction is unavailable.",
    }),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: /predict/i })).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(
    screen.getByRole("link", { name: "Explore Indian statistics" }),
  ).toHaveAttribute("href", "/analytics");
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
