"use client";
import { Prediction, predictionSchema } from "@/lib/contracts";
import { api, downloadText } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { Failure, Limitation, Panel } from "./ui";
import { CurrentResult } from "./KarnatakaWorkspace";
function SavedIndianResult({ prediction }: { prediction: Prediction }) {
  const rerun = useMutation({
    mutationFn: () =>
      api("predict", predictionSchema, {
        method: "POST",
        body: JSON.stringify({ scenario: prediction.scenario, save: false }),
      }),
  });
  return (
    <>
      <CurrentResult result={rerun.data ?? prediction} />
      <button
        className="button"
        disabled={rerun.isPending}
        onClick={() => rerun.mutate()}
      >
        Run these inputs again
      </button>
      {rerun.error && <Failure error={rerun.error} />}
    </>
  );
}
export default function PredictionResult({
  prediction,
}: {
  prediction: Prediction;
}) {
  if (!prediction.historical_only && prediction.source_country === "India")
    return <SavedIndianResult prediction={prediction} />;
  return (
    <Panel
      title="Historical model result"
      subtitle={`${prediction.source_country} | ${prediction.model_version}`}
    >
      <Limitation>
        This is an archived result from {prediction.source_country}. It is not
        an Indian estimate and cannot be rerun. Its original labels, units and
        probabilities are preserved.
      </Limitation>
      <p>
        Original output: <strong>{prediction.severity}</strong>
      </p>
      <p>
        Original estimated probability:{" "}
        {(prediction.confidence * 100).toFixed(1)}%
      </p>
      <p>Original speed unit: {prediction.speed_unit ?? "Not verified"}</p>
      <table>
        <thead>
          <tr>
            <th>Original outcome label</th>
            <th>Stored probability</th>
          </tr>
        </thead>
        <tbody>
          {prediction.probabilities.map((p) => (
            <tr key={p.class_id}>
              <td>{p.label}</td>
              <td>{(p.probability * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Original stored inputs and technical details</summary>
        <pre
          className="india-json"
          tabIndex={0}
          aria-label="Original historical payload"
        >
          {JSON.stringify(prediction, null, 2)}
        </pre>
      </details>
      <button
        className="button small"
        onClick={() =>
          downloadText(
            `roadsentinel-history-${prediction.id}.json`,
            JSON.stringify(prediction, null, 2),
            "application/json",
          )
        }
      >
        Export original record
      </button>
    </Panel>
  );
}
