"use client";
import { Prediction } from "@/lib/contracts";
import { downloadText } from "@/lib/api";
import { Limitation, Panel } from "./ui";
export default function PredictionResult({
  prediction,
}: {
  prediction: Prediction;
}) {
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
