"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { ModelMetadata, Prediction, predictionSchema } from "@/lib/contracts";
import {
  Failure,
  Limitation,
  Loading,
  PageTitle,
  Panel,
  useMetadata,
} from "./ui";

type Scenario = Record<string, string>;
type Mode = "predict" | "compare" | "explain" | "batch" | "model";
const names: Record<Mode, [string, string]> = {
  predict: [
    "Explore a crash scenario.",
    "Four recorded outcomes, one transparent Indian research model.",
  ],
  compare: [
    "Compare the conditions.",
    "Change a scenario and inspect how the model scores respond.",
  ],
  explain: [
    "See what shapes the estimate.",
    "Exact linear SHAP contributions explain the model's class score.",
  ],
  batch: [
    "Analyse scenarios together.",
    "Validate a CSV, run up to 500 scenarios and export every result.",
  ],
  model: [
    "Evidence before confidence.",
    "Source coverage, held-out evaluation and the limits of this model.",
  ],
};
const pct = (n: number) => `${(100 * n).toFixed(1)}%`;
const categoryLabel = (v: string) =>
  v === "NH"
    ? "National Highway (NH)"
    : v === "Dust Storn"
      ? "Dust storm (source: Dust Storn)"
      : v.replace(/ Dist$/, " District");
const csvCell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;

export function ScenarioFields({
  meta,
  value,
  onChange,
  prefix,
}: {
  meta: ModelMetadata;
  value: Scenario;
  onChange: (v: Scenario) => void;
  prefix: string;
}) {
  return (
    <div className="india-filter-grid">
      {meta.features.map((f) => (
        <div className="field" key={f.key}>
          <label htmlFor={`${prefix}-${f.key}`}>{f.label}</label>
          <select
            id={`${prefix}-${f.key}`}
            value={value[f.key] ?? f.default}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          >
            {f.options.map((v) => (
              <option key={v} value={v}>
                {categoryLabel(v)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function CurrentResult({ result }: { result: Prediction }) {
  const explanation = result.explanation;
  return (
    <Panel
      title={`Model outcome: ${result.severity}`}
      subtitle={`${result.region ?? "Karnataka"}, India | ${result.model_version}`}
    >
      <p className="result-score">
        {pct(result.confidence)}{" "}
        <span>model score for the selected outcome</span>
      </p>
      <p>
        Class-balanced research scores are not calibrated personal
        probabilities. This is conditional on a reported crash, not the chance
        of having an accident.
      </p>
      <div className="score-list">
        {result.probabilities.map((p) => (
          <div key={p.class_id}>
            <div className="score-label">
              <span>{p.label}</span>
              <strong>{pct(p.probability)}</strong>
            </div>
            <progress
              aria-label={`${p.label} model score`}
              value={p.probability}
              max={1}
            />
          </div>
        ))}
      </div>
      {explanation && (
        <>
          <h3>Why this outcome?</h3>
          <p>
            These inputs raise or lower the model score for {explanation.class}.
            Larger contributions have more influence. They describe patterns
            learned from the data, not causes.
          </p>
          <div
            className="table-scroll"
            role="region"
            aria-label="Model explanation"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Input</th>
                  <th>Value</th>
                  <th>Influence on model score</th>
                </tr>
              </thead>
              <tbody>
                {[...explanation.contributions]
                  .sort(
                    (a, b) =>
                      Math.abs(b.contribution) - Math.abs(a.contribution),
                  )
                  .map((c) => (
                    <tr key={c.feature}>
                      <th scope="row">{c.label}</th>
                      <td>{categoryLabel(c.value)}</td>
                      <td>
                        {c.contribution >= 0 ? "Raises: +" : "Lowers: "}
                        {c.contribution.toFixed(4)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>Technical explanation details</summary>
            <p className="chart-annotation">
              Background {explanation.base_value.toFixed(4)} + contributions =
              output logit {explanation.output_logit.toFixed(4)}. Exact
              interventional linear SHAP using training-data marginal
              frequencies.
            </p>
          </details>
        </>
      )}
      <button
        className="button small"
        onClick={() =>
          downloadText(
            `roadsentinel-${result.id}.json`,
            JSON.stringify(result, null, 2),
            "application/json",
          )
        }
      >
        Export result and explanation
      </button>
    </Panel>
  );
}

function Evaluation({ meta }: { meta: ModelMetadata }) {
  return (
    <>
      <Panel
        title="Held-out 2023 results"
        subtitle={`${meta.evaluation.n.toLocaleString("en-IN")} crash records | model selected on 2022 validation, fitted on 2016-2021`}
      >
        <Limitation>
          Performance is modest. This model is for research and demonstration,
          not safety-critical decisions, emergency triage or choosing a safe
          speed.
        </Limitation>
        <table>
          <thead>
            <tr>
              <th>Measure</th>
              <th>Research model</th>
              <th>Majority baseline</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Macro F1</th>
              <td>{meta.evaluation.macro_f1.toFixed(3)}</td>
              <td>{meta.baseline.macro_f1.toFixed(3)}</td>
            </tr>
            <tr>
              <th>Balanced accuracy</th>
              <td>{pct(meta.evaluation.balanced_accuracy)}</td>
              <td>{pct(meta.baseline.balanced_accuracy)}</td>
            </tr>
            <tr>
              <th>Overall accuracy</th>
              <td>{pct(Number(meta.evaluation.per_class.accuracy))}</td>
              <td>{pct(Number(meta.baseline.per_class.accuracy))}</td>
            </tr>
          </tbody>
        </table>
        <p>
          The model predicts all four outcomes. Its overall accuracy is lower
          than the majority baseline; its class-balanced measures are higher.
        </p>
        <h3>Per-class recall</h3>
        <details>
          <summary>Score quality and complete class metrics</summary>
          <p>
            Lower Brier score and log loss are better. These diagnostics do not
            establish personal-risk calibration.
          </p>
          <p>
            Model Brier score:{" "}
            {meta.evaluation.probability_quality.multiclass_brier_sum.toFixed(
              4,
            )}
            ; majority baseline:{" "}
            {meta.baseline.probability_quality.multiclass_brier_sum.toFixed(4)}.
            Model log loss:{" "}
            {meta.evaluation.probability_quality.log_loss.toFixed(4)}; baseline:{" "}
            {meta.baseline.probability_quality.log_loss.toFixed(4)}.
          </p>
          <p>{meta.evaluation.probability_quality.definition}</p>
          <pre className="india-json" tabIndex={0}>
            {JSON.stringify(meta.evaluation.per_class, null, 2)}
          </pre>
        </details>
        <table>
          <thead>
            <tr>
              <th>Recorded outcome</th>
              <th>Recall</th>
              <th>Test records</th>
            </tr>
          </thead>
          <tbody>
            {meta.classes.map((c) => {
              const m = meta.evaluation.per_class[c];
              return typeof m === "number" ? null : (
                <tr key={c}>
                  <th>{c}</th>
                  <td>{pct(m.recall)}</td>
                  <td>{m.support.toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>Confusion matrix</h3>
        <p>Rows are recorded outcomes; columns are model predictions.</p>
        <div
          className="table-scroll"
          role="region"
          aria-label="Confusion matrix"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Recorded / predicted</th>
                {meta.classes.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meta.evaluation.confusion_matrix.map((r, i) => (
                <tr key={meta.classes[i]}>
                  <th>{meta.classes[i]}</th>
                  {r.map((n, j) => (
                    <td key={j}>{n.toLocaleString("en-IN")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Data, licence and coverage">
        <p>
          <a href={meta.source_url}>{meta.source}</a>. Published under{" "}
          <a href={meta.license_url}>{meta.license}</a>. Noncommercial research
          use; derived model/data artifacts retain the same licence. No
          government endorsement is implied.
        </p>
        <p>
          {meta.algorithm}. Four source labels: Damage Only, Simple Injury,
          Grievous Injury and Fatal. These are crash-record categories, not
          clinical diagnoses.
        </p>
        <p>
          National dashboards use separate official MoRTH aggregates. The model
          covers Karnataka police units only.
        </p>
        <ul>
          {meta.limitations.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <details>
          <summary>Training split and cleaning audit</summary>
          <pre className="india-json" tabIndex={0}>
            {JSON.stringify(
              {
                split: meta.split,
                cleaning: meta.cleaning,
                source_sha256: meta.source_sha256,
              },
              null,
              2,
            )}
          </pre>
        </details>
        <button
          className="button small"
          onClick={() =>
            downloadText(
              "roadsentinel-karnataka-model-card.json",
              JSON.stringify(meta, null, 2),
              "application/json",
            )
          }
        >
          Export model card
        </button>
      </Panel>
    </>
  );
}

function Workspace({ meta, mode }: { meta: ModelMetadata; mode: Mode }) {
  const defaults = Object.fromEntries(
    meta.features.map((f) => [f.key, f.default]),
  );
  const [scenario, setScenario] = useState<Scenario>(defaults),
    [alternative, setAlternative] = useState<Scenario>(defaults),
    [save, setSave] = useState(false),
    [csv, setCsv] = useState(""),
    [fileError, setFileError] = useState("");
  const cache = useQueryClient();
  const single = useMutation({
    mutationFn: () =>
      api(mode === "explain" ? "explain/local" : "predict", predictionSchema, {
        method: "POST",
        body: JSON.stringify({ scenario, save: mode === "predict" && save }),
      }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["history"] }),
  });
  const comparison = useMutation({
    mutationFn: () =>
      api(
        "predict/whatif",
        z.object({
          baseline: predictionSchema,
          alternative: predictionSchema,
          interpretation: z.string(),
        }),
        {
          method: "POST",
          body: JSON.stringify({ baseline: scenario, alternative }),
        },
      ),
  });
  const preview = useMutation({
    mutationFn: () =>
      api(
        "batch/preview",
        z.object({
          count: z.number(),
          preview: z.array(z.record(z.string(), z.string())),
        }),
        { method: "POST", body: JSON.stringify({ csv }) },
      ),
  });
  const batch = useMutation({
    mutationFn: () =>
      api(
        "predict/batch",
        z.object({
          count: z.number(),
          results: z.array(predictionSchema),
          country: z.literal("India"),
          region: z.literal("Karnataka"),
          model_version: z.string(),
        }),
        { method: "POST", body: JSON.stringify({ csv, save }) },
      ),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["history"] }),
  });
  const busy =
    single.isPending ||
    comparison.isPending ||
    batch.isPending ||
    preview.isPending;
  function update(value: Scenario, which = false) {
    if (which) setAlternative(value);
    else setScenario(value);
    single.reset();
    comparison.reset();
  }
  const label = mode === "explain" ? "Explain scenario" : "Run prediction";
  return (
    <>
      {mode === "model" ? (
        <Evaluation meta={meta} />
      ) : mode === "batch" ? (
        <>
          <Panel
            title="Upload scenario CSV"
            subtitle="Inputs are hypothetical user scenarios, not new accident observations."
          >
            <button
              className="button small"
              onClick={() =>
                downloadText(
                  "roadsentinel-karnataka-template.csv",
                  [
                    meta.features
                      .map((f) => f.key)
                      .map(csvCell)
                      .join(","),
                    meta.features
                      .map((f) => f.default)
                      .map(csvCell)
                      .join(","),
                  ].join("\r\n"),
                  "text/csv",
                )
              }
            >
              Download CSV template
            </button>
            <fieldset disabled={busy} className="scenario-fieldset">
              <div className="field">
                <label htmlFor="scenario-csv">
                  Scenario file (.csv, at most 2 MiB and 500 rows)
                </label>
                <input
                  id="scenario-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    preview.reset();
                    batch.reset();
                    setCsv("");
                    setFileError("");
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      setFileError("Choose a file smaller than 2 MiB.");
                      return;
                    }
                    try {
                      setCsv(await file.text());
                    } catch {
                      setFileError("The file could not be read.");
                    }
                  }}
                />
              </div>
              <label className="save-choice">
                <input
                  type="checkbox"
                  checked={save}
                  onChange={(e) => setSave(e.target.checked)}
                />
                Save batch results in this browser session
              </label>
              <div className="actions">
                <button
                  className="button"
                  disabled={!csv}
                  onClick={() => preview.mutate()}
                >
                  Validate CSV
                </button>
                <button
                  className="button primary"
                  disabled={!preview.data}
                  onClick={() => batch.mutate()}
                >
                  Run batch
                </button>
              </div>
            </fieldset>
            {fileError && <p role="alert">{fileError}</p>}
            {preview.error && <Failure error={preview.error} />}{" "}
            {preview.data && (
              <p role="status">
                {preview.data.count} valid scenarios. Ready to run.
              </p>
            )}
            {batch.error && <Failure error={batch.error} />}{" "}
            {busy && <Loading message="Processing scenarios..." />}
          </Panel>
          {batch.data && (
            <Panel
              title={`${batch.data.count} results`}
              action={
                <button
                  className="button small"
                  onClick={() => {
                    const rs = batch.data!.results;
                    downloadText(
                      "roadsentinel-karnataka-results.csv",
                      [
                        [
                          "country",
                          "region",
                          "model_version",
                          "source_url",
                          "license",
                          "score_interpretation",
                          ...meta.features.map((f) => f.key),
                          "predicted_outcome",
                          ...meta.classes.map((c) => `${c}_model_score`),
                        ],
                        ...rs.map((r) => [
                          r.source_country,
                          r.region,
                          r.model_version,
                          meta.source_url,
                          meta.license,
                          "Uncalibrated model scores, not personal accident probabilities",
                          ...meta.features.map((f) =>
                            categoryLabel(String(r.scenario[f.key])),
                          ),
                          r.severity,
                          ...meta.classes.map(
                            (c) =>
                              r.probabilities.find((p) => p.label === c)
                                ?.probability,
                          ),
                        ]),
                      ]
                        .map((r) => r.map(csvCell).join(","))
                        .join("\r\n"),
                      "text/csv",
                    );
                  }}
                >
                  Export results CSV
                </button>
              }
            >
              <div
                className="table-scroll"
                role="region"
                aria-label="Batch results"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Model outcome</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.data.results.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.severity}</td>
                        <td>{pct(r.confidence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      ) : (
        <>
          <Panel
            title={
              mode === "compare" ? "Baseline scenario" : "Scenario conditions"
            }
            subtitle="Karnataka only. Use documented context categories."
          >
            <fieldset className="scenario-fieldset" disabled={busy}>
              <ScenarioFields
                meta={meta}
                value={scenario}
                onChange={(v) => update(v)}
                prefix="baseline"
              />
              {mode === "compare" && (
                <>
                  <h3>Alternative scenario</h3>
                  <ScenarioFields
                    meta={meta}
                    value={alternative}
                    onChange={(v) => update(v, true)}
                    prefix="alternative"
                  />
                </>
              )}
              {mode === "predict" && (
                <label className="save-choice">
                  <input
                    type="checkbox"
                    checked={save}
                    onChange={(e) => setSave(e.target.checked)}
                  />
                  Save this result to history
                </label>
              )}
              <button
                className="button primary"
                onClick={() =>
                  mode === "compare" ? comparison.mutate() : single.mutate()
                }
              >
                {mode === "compare" ? "Compare scenarios" : label}
              </button>
            </fieldset>
            {busy && <Loading message="Calculating model scores..." />}
            {single.error && <Failure error={single.error} />}{" "}
            {comparison.error && <Failure error={comparison.error} />}
          </Panel>
          {single.data && <CurrentResult result={single.data} />}
          {comparison.data && (
            <>
              <Panel title="Score changes">
                <p>{comparison.data.interpretation}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Outcome</th>
                      <th>Baseline</th>
                      <th>Alternative</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.data.baseline.probabilities.map((p, i) => {
                      const q = comparison.data!.alternative.probabilities[i];
                      return (
                        <tr key={p.label}>
                          <th>{p.label}</th>
                          <td>{pct(p.probability)}</td>
                          <td>{pct(q.probability)}</td>
                          <td>
                            {((q.probability - p.probability) * 100).toFixed(1)}{" "}
                            percentage points
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button
                  className="button small"
                  onClick={() =>
                    downloadText(
                      "roadsentinel-comparison.json",
                      JSON.stringify(comparison.data, null, 2),
                      "application/json",
                    )
                  }
                >
                  Export comparison
                </button>
              </Panel>
              <CurrentResult result={comparison.data.baseline} />
              <CurrentResult result={comparison.data.alternative} />
            </>
          )}
          {mode === "explain" && (
            <Panel
              title="Global feature contributions"
              subtitle="Mean absolute interventional SHAP on training records, by class logit."
            >
              {Object.entries(meta.explanation.global).map(([c, features]) => (
                <details key={c}>
                  <summary>{c}</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Input</th>
                        <th>Mean absolute contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...features]
                        .sort(
                          (a, b) => b.mean_absolute_shap - a.mean_absolute_shap,
                        )
                        .map((f) => (
                          <tr key={f.feature}>
                            <th>{f.label}</th>
                            <td>{f.mean_absolute_shap.toFixed(4)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </details>
              ))}
            </Panel>
          )}
        </>
      )}
    </>
  );
}

export default function KarnatakaWorkspace({ mode }: { mode: Mode }) {
  const meta = useMetadata();
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="INDIA / KARNATAKA RESEARCH"
        title={names[mode][0]}
        description={names[mode][1]}
      />
      <Limitation>
        Karnataka crash records, 2016-2023. Research model with modest held-out
        performance.{" "}
        <Link href="/model-card">Read evaluation and coverage</Link>.{" "}
        <Link href="/">National statistics</Link>.
      </Limitation>
      {meta.isPending ? (
        <Loading />
      ) : meta.error ? (
        <Failure error={meta.error} retry={() => void meta.refetch()} />
      ) : (
        meta.data && (
          <Workspace
            key={`${meta.data.model_version}-${mode}`}
            meta={meta.data}
            mode={mode}
          />
        )
      )}
    </div>
  );
}
