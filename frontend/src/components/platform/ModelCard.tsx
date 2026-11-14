"use client";
import { useQuery } from "@tanstack/react-query";
import { api, downloadText } from "@/lib/api";
import {
  metricsSchema,
  labels,
  options,
  performanceNote,
} from "@/lib/contracts";
import {
  Failure,
  Limitation,
  Loading,
  PageTitle,
  Panel,
  useMetadata,
} from "./ui";
export default function ModelCard() {
  const metadata = useMetadata(),
    metrics = useQuery({
      queryKey: ["model-metrics"],
      queryFn: () => api("metrics", metricsSchema),
    });
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="RESOURCES / MODEL CARD"
        title="The evidence and its limits."
        description="Reproducible training, documented outcomes, and a genuinely held-out 2023 test."
      />
      <Limitation>{performanceNote}</Limitation>
      {metadata.isPending ? (
        <Loading />
      ) : metadata.error ? (
        <Failure error={metadata.error} retry={() => void metadata.refetch()} />
      ) : (
        metadata.data && (
          <>
            <div className="two-columns">
              <Panel title="What this model estimates">
                <p>{metadata.data.target}</p>
                <p>{metadata.data.coverage}</p>
                <p>
                  It does not estimate whether a crash will happen. There are no
                  safe journeys or non-crash controls in this dataset.
                </p>
                <p className="chart-annotation">
                  Model {metadata.data.model_version} ·{" "}
                  {metadata.data.algorithm}. Posted speed limits: mph.
                </p>
                <details className="details-panel">
                  <summary>Artifact integrity</summary>
                  <code className="code-block">
                    {metadata.data.artifact_sha256}
                  </code>
                </details>
              </Panel>
              <Panel title="Documented injury outcomes">
                {Object.entries(metadata.data.class_definitions).map(
                  ([label, definition]) => (
                    <p key={label}>
                      <strong>{label}:</strong> {definition}
                    </p>
                  ),
                )}
                <a
                  className="text-link"
                  href="https://www.gov.uk/government/publications/reported-road-casualty-statistics-background-quality-report/reported-road-casualty-statistics-background-quality-report"
                >
                  DfT definitions and quality guidance
                </a>
              </Panel>
            </div>
            <Panel
              title="Held-out evaluation"
              subtitle="Model probabilities are not measured accuracy"
            >
              {metrics.isPending ? (
                <Loading />
              ) : metrics.error ? (
                <Failure
                  error={metrics.error}
                  retry={() => void metrics.refetch()}
                />
              ) : (
                metrics.data && (
                  <>
                    <p>
                      {metrics.data.test_size.toLocaleString()} test crashes.{" "}
                      {metrics.data.split}.
                    </p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Measure</th>
                            <th>Test result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["Macro F1", metrics.data.macro_f1],
                            [
                              "Balanced accuracy",
                              metrics.data.balanced_accuracy,
                            ],
                            ["Accuracy", metrics.data.accuracy],
                            [
                              "Log loss (lower is better)",
                              metrics.data.log_loss,
                            ],
                            [
                              "Multiclass Brier score (0–2, lower is better)",
                              metrics.data.brier_multiclass,
                            ],
                            [
                              "Calibration error (10 bins)",
                              metrics.data.ece_10_bins,
                            ],
                          ].map(([label, value]) => (
                            <tr key={String(label)}>
                              <td>{label}</td>
                              <td>{Number(value).toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <h3>Performance for each injury outcome</h3>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Outcome</th>
                            <th>Precision</th>
                            <th>Recall</th>
                            <th>F1</th>
                            <th>Test cases</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            metrics.data.classification_report,
                          ).map(([label, r]) => (
                            <tr key={label}>
                              <td>{label}</td>
                              <td>{r.precision.toFixed(4)}</td>
                              <td>{r.recall.toFixed(4)}</td>
                              <td>{r["f1-score"].toFixed(4)}</td>
                              <td>{r.support}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="chart-annotation">
                      Zero precision is reported when no cases are predicted for
                      an outcome. High overall accuracy mostly reflects the
                      common slight-injury outcome.
                    </p>
                    <h3>Confusion matrix</h3>
                    <div className="table-scroll">
                      <table>
                        <caption>
                          Rows: recorded injury. Columns: most likely predicted
                          injury.
                        </caption>
                        <thead>
                          <tr>
                            <th>Recorded / predicted</th>
                            {metrics.data.class_labels.map((l) => (
                              <th key={l}>{l}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.data.confusion_matrix.map((r, i) => (
                            <tr key={i}>
                              <th>{metrics.data!.class_labels[i]}</th>
                              {r.map((v, j) => (
                                <td key={j}>{v}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <details className="details-panel">
                      <summary>
                        Model selection and probability calibration
                      </summary>
                      <p>{metrics.data.rule}</p>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Candidate</th>
                              <th>Validation log loss</th>
                              <th>Macro F1</th>
                              <th>Calibrated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.data.comparison.map((r) => (
                              <tr key={r.candidate}>
                                <td>{r.candidate}</td>
                                <td>{r.selected_log_loss.toFixed(4)}</td>
                                <td>{r.validation_macro_f1.toFixed(4)}</td>
                                <td>{r.calibration_selected ? "Yes" : "No"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p>
                        Selected: {metrics.data.selected_model}.
                        Post-calibration did not improve the selected model, so
                        it was not applied. Weighted models improved raw
                        minority-class recall but distorted probabilities. See
                        the exported report for raw and calibrated results,
                        split class counts and the baseline.
                      </p>
                    </details>
                    <button
                      className="button small"
                      onClick={() =>
                        downloadText(
                          "roadsentinel-model-card.json",
                          JSON.stringify(
                            {
                              metadata: metadata.data,
                              evaluation: metrics.data,
                            },
                            null,
                            2,
                          ),
                          "application/json",
                        )
                      }
                    >
                      Export model card and evaluation
                    </button>
                  </>
                )
              )}
            </Panel>
            <Panel title="Inputs and eligibility">
              <p>
                These describe the road environment and time before impact.
                Injury fields, casualty counts, vehicle counts, police
                attendance, coordinates, severity adjustments and post-crash
                assessments are excluded.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Input</th>
                      <th>Documented choices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata.data.feature_order.map((f) => (
                      <tr key={f}>
                        <td>{labels[f]}</td>
                        <td>{options[f].map(([, l]) => l).join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Missing source values stay in an explicit unknown category.
                Categorical inputs use a fitted one-hot pipeline; no ordinal
                meaning is assigned to their codes. Hour is derived from the
                recorded local time.
              </p>
            </Panel>
            <Panel title="Intended use and limitations">
              <ul>
                {metadata.data.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </Panel>
            <Panel title="Source and licence">
              <p>
                {metadata.data.provenance}. Training uses 2022, test and
                displayed observations use 2023. Newer data exist; these pinned
                years are used for reproducibility.
              </p>
              <p>
                Contains public sector information licensed under the{" "}
                <a
                  className="text-link"
                  href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                >
                  Open Government Licence v3.0
                </a>
                . RoadSentinel is not endorsed by DfT.
              </p>
              <a
                className="text-link"
                href="https://www.gov.uk/government/statistical-data-sets/road-safety-open-data"
              >
                Official data and codebook
              </a>
            </Panel>
          </>
        )
      )}
    </div>
  );
}
