import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import ScenarioForm from "./ScenarioForm";
import PredictionWorkspace from "./PredictionWorkspace";
import PredictionResult from "./PredictionResult";
import { defaults, Prediction } from "@/lib/contracts";
const result: Prediction = {
  id: "test-result",
  created_at: "2026-11-14T00:00:00Z",
  model_version: "unit-test-model",
  schema_version: 2,
  scenario: defaults,
  class_id: "3",
  severity: "Slight injury",
  semantics_verified: true,
  probabilities: [
    { class_id: "1", label: "Fatal injury", probability: 0.01 },
    { class_id: "2", label: "Serious injury", probability: 0.24 },
    { class_id: "3", label: "Slight injury", probability: 0.75 },
  ],
  confidence: 0.75,
  calibrated: false,
  risk_score: null,
  latency_ms: 2,
  explanation: null,
  explanation_status: "not_requested",
  saved: false,
};
afterEach(() => vi.unstubAllGlobals());
it("submits human-labelled mph and category choices and reports changes", () => {
  const submit = vi.fn(),
    change = vi.fn();
  render(<ScenarioForm pending={false} onSubmit={submit} onChange={change} />);
  fireEvent.change(screen.getByLabelText("Posted speed limit (mph)"), {
    target: { value: "60" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Run model prediction" }));
  expect(change).toHaveBeenCalled();
  expect(submit).toHaveBeenCalledWith({ ...defaults, speed_limit: 60 }, false);
  expect(
    screen.getByRole("option", { name: "Raining, no high winds" }),
  ).toHaveValue("2");
});
it("clears a displayed result when a scenario input changes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => result }),
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <PredictionWorkspace />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Run model prediction" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Most likely injury severity" }),
    ).toBeInTheDocument(),
  );
  fireEvent.change(screen.getByLabelText("Weather"), {
    target: { value: "2" },
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Most likely injury severity" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("heading", { name: "Ready when you are" }),
  ).toBeInTheDocument();
});
it("retains original labels and version for an old numeric record", () => {
  render(
    <PredictionResult
      prediction={{
        ...result,
        schema_version: 1,
        semantics_verified: false,
        model_version: "legacy-v0",
        severity: "Class 3",
        scenario: { Speed_limit: 30 },
      }}
    />,
  );
  expect(screen.getByText("Class 3")).toBeInTheDocument();
  expect(screen.getByText(/Model legacy-v0/)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Share scenario" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/not reinterpreted/)).toBeInTheDocument();
});
it("disables scenario changes while inference is pending", () => {
  render(<ScenarioForm pending onSubmit={vi.fn()} />);
  expect(screen.getByLabelText("Weather")).toBeDisabled();
});
