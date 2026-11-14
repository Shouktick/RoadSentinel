"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Prediction,
  scenarioSchema,
  shareScenario,
  labels,
  inputLabel,
  scopeNote,
  performanceNote,
} from "@/lib/contracts";
import { downloadText } from "@/lib/api";
import { Limitation, Panel, Status } from "./ui";
export function ProbabilityBars({ prediction }: { prediction: Prediction }) {
  return (
    <div
      className="distribution"
      aria-label="Estimated injury severity probabilities"
    >
      {prediction.probabilities.map((p, i) => (
        <div key={p.class_id}>
          <div className="bar-label">
            <span>{p.label}</span>
            <strong>{(p.probability * 100).toFixed(1)}%</strong>
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill class-${i}`}
              style={{ width: `${p.probability * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function Contributions({
  prediction,
  limit = 8,
}: {
  prediction: Prediction;
  limit?: number;
  simple?: boolean;
}) {
  const explanation = prediction.explanation;
  if (!explanation)
    return (
      <p className="chart-annotation">
        An explanation was {prediction.explanation_status.replaceAll("_", " ")}{" "}
        for this result.
      </p>
    );
  const contributions = [...explanation.contributions]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, limit);
  const max = Math.max(
    ...contributions.map((c) => Math.abs(c.contribution)),
    0.001,
  );
  return (
    <div>
      <p className="chart-annotation">
        These inputs move the estimate for{" "}
        <strong>{prediction.severity.toLowerCase()}</strong> up or down from the
        reference estimate. They describe patterns in the model, not causes of
        injury.
      </p>
      <div className="contribution-list">
        {contributions.map((row) => (
          <div className="contribution-row" key={row.feature}>
            <span>
              {labels[row.feature] || row.feature}
              <small style={{ display: "block" }}>
                {inputLabel(row.feature, row.value)}
              </small>
            </span>
            <div className="contribution-track">
              <div className="contribution-half">
                {row.contribution < 0 && (
                  <div
                    className="contribution-bar negative"
                    style={{
                      width: `${(Math.abs(row.contribution) / max) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="contribution-half">
                {row.contribution >= 0 && (
                  <div
                    className="contribution-bar"
                    style={{ width: `${(row.contribution / max) * 100}%` }}
                  />
                )}
              </div>
            </div>
            <span className="mono">
              {row.contribution >= 0 ? "+" : ""}
              {(row.contribution * 100).toFixed(2)} pp
            </span>
          </div>
        ))}
      </div>
      <p className="chart-annotation">
        pp means percentage points. Reference{" "}
        {(explanation.base_value * 100).toFixed(2)}% + all contributions ={" "}
        {(explanation.output_value * 100).toFixed(2)}%.
      </p>
      <details className="details-panel">
        <summary>Technical explanation (SHAP)</summary>
        <p>
          {explanation.method}. The 16 reference scenarios are sampled from
          training records. Missing inputs are replaced across that reference
          set; correlated road conditions may produce unrealistic combinations.
        </p>
      </details>
    </div>
  );
}
export default function PredictionResult({
  prediction,
}: {
  prediction: Prediction;
}) {
  const [message, setMessage] = useState("");
  const compatible =
    prediction.schema_version === 2 &&
    scenarioSchema.safeParse(prediction.scenario).success;
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied.");
    } catch {
      setMessage("Clipboard unavailable. Use Export JSON.");
    }
  }
  return (
    <Panel
      title={
        compatible ? "Most likely injury severity" : "Historical model result"
      }
      subtitle={`Model ${prediction.model_version} · ${prediction.latency_ms.toFixed(1)} ms`}
      action={<Status tone="good">ACTUAL INFERENCE</Status>}
      className="result-panel"
    >
      {!compatible && (
        <Limitation>
          Legacy record: its original labels and model version are preserved.
          Severity meanings and speed units were not verified. This record is
          not reinterpreted using the replacement model.
        </Limitation>
      )}
      <div className="result-verdict">
        <div>
          <strong>{prediction.severity}</strong>
          <small>
            {compatible
              ? "Most severe injury in a recorded crash"
              : "Original stored label"}
          </small>
        </div>
        <div className="result-confidence">
          <strong>{(prediction.confidence * 100).toFixed(1)}%</strong>
          <small>Estimated probability</small>
        </div>
      </div>
      {compatible && (
        <p className="chart-annotation">
          {prediction.class_definitions?.[prediction.severity]}
        </p>
      )}
      <ProbabilityBars prediction={prediction} />
      {compatible && <Limitation>{scopeNote}</Limitation>}
      {compatible && (
        <>
          <Limitation>{performanceNote}</Limitation>
          <h3>What influenced this estimate?</h3>
          <Contributions prediction={prediction} />
        </>
      )}
      <div className="actions">
        <button
          className="button small"
          onClick={() =>
            void copy(
              compatible
                ? `RoadSentinel\nModel: ${prediction.model_version}\nMost likely injury severity: ${prediction.severity}\nEstimated probability: ${(prediction.confidence * 100).toFixed(1)}%\n${scopeNote}\n${performanceNote}`
                : `RoadSentinel legacy record\nModel: ${prediction.model_version}\nOriginal label: ${prediction.severity}\nOriginal probability: ${(prediction.confidence * 100).toFixed(1)}%\nSeverity meanings and speed units were not verified.`,
            )
          }
        >
          Copy summary
        </button>
        {compatible && (
          <button
            className="button small"
            onClick={() =>
              void copy(
                `${location.origin}/predict?scenario=${shareScenario(scenarioSchema.parse(prediction.scenario))}`,
              )
            }
          >
            Share scenario
          </button>
        )}
        <button
          className="button small"
          onClick={() =>
            downloadText(
              `roadsentinel-${prediction.id.slice(0, 8)}.json`,
              JSON.stringify(prediction, null, 2),
              "application/json",
            )
          }
        >
          Export JSON
        </button>
        {prediction.saved && (
          <Link className="text-link" href={`/history?id=${prediction.id}`}>
            Open saved record
          </Link>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {compatible && (
        <p className="chart-annotation">
          No safety score is calculated.{" "}
          {prediction.calibrated
            ? "Probability calibration is included."
            : "Probabilities were not post-calibrated; see the model card for measured probability quality."}
        </p>
      )}
    </Panel>
  );
}
