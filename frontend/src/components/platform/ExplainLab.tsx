"use client";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { predictionSchema, Scenario } from "@/lib/contracts";
import ScenarioForm from "./ScenarioForm";
import PredictionResult from "./PredictionResult";
import { Failure, Loading, PageTitle, Panel } from "./ui";
export default function ExplainLab() {
  const local = useMutation({
    mutationFn: (scenario: Scenario) =>
      api("explain/local", predictionSchema, {
        method: "POST",
        body: JSON.stringify(scenario),
      }),
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INTELLIGENCE / EXPLANATIONS"
        title="What influenced this estimate?"
        description="Explore how each road condition moves a specific model estimate up or down. Contributions do not establish causes."
      />
      <div className="prediction-grid">
        <Panel
          title="Explain a scenario"
          subtitle="Current model · eight documented inputs"
        >
          <ScenarioForm
            pending={local.isPending}
            allowSave={false}
            submitLabel="Explain this estimate"
            onChange={() => local.reset()}
            onSubmit={(s) => local.mutate(s)}
          />
        </Panel>
        <div aria-live="polite">
          {local.isPending ? (
            <Loading message="Calculating contributions…" />
          ) : local.error ? (
            <Failure
              error={local.error}
              retry={() => local.variables && local.mutate(local.variables)}
            />
          ) : local.data ? (
            <PredictionResult prediction={local.data} />
          ) : (
            <Panel title="Your explanation">
              <p>
                Run a scenario to see its probabilities and all eight
                contributions. Saved records keep their original explanation in
                History.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
