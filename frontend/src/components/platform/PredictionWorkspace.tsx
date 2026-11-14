"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { predictionSchema, Scenario, scopeNote } from "@/lib/contracts";
import ScenarioForm from "./ScenarioForm";
import PredictionResult from "./PredictionResult";
import { Empty, Failure, Limitation, Loading, PageTitle, Panel } from "./ui";
export default function PredictionWorkspace() {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: { scenario: Scenario; save: boolean }) =>
      api("predict", predictionSchema, {
        method: "POST",
        body: JSON.stringify({ ...payload, explain: true }),
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["history"] });
      void cache.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="WORKSPACE / PREDICTION"
        title="Explore injury severity."
        description="A road-condition scenario based on documented Great Britain collision data."
      />
      <Limitation>{scopeNote}</Limitation>
      <div className="prediction-grid">
        <Panel
          title="Scenario parameters"
          subtitle="Eight documented inputs · Great Britain · posted limits in mph"
        >
          <ScenarioForm
            allowShared
            pending={mutation.isPending}
            onChange={() => mutation.reset()}
            onSubmit={(scenario, save) => mutation.mutate({ scenario, save })}
          />
        </Panel>
        <div className="page-stack" aria-live="polite">
          {mutation.isPending ? (
            <Panel>
              <Loading message="Estimating severity and explaining this scenario…" />
            </Panel>
          ) : mutation.error ? (
            <Failure
              error={mutation.error}
              retry={() =>
                mutation.variables && mutation.mutate(mutation.variables)
              }
            />
          ) : mutation.data ? (
            <PredictionResult prediction={mutation.data} />
          ) : (
            <Panel>
              <Empty title="Ready when you are">
                Choose road conditions and run the model. Changing an input
                clears the previous result.
              </Empty>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
