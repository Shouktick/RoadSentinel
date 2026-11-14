"use client";
import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";
import { z } from "zod";
import { api, downloadText } from "@/lib/api";
import { uploadApi } from "@/lib/upload";
import { defaults, predictionSchema } from "@/lib/contracts";
import { Failure, labels, Limitation, PageTitle, Panel, Status } from "./ui";

const previewSchema = z.object({
  headers: z.array(z.string()),
  row_count: z.number(),
  preview: z.array(z.record(z.string(), z.string().nullable())),
});
const batchSchema = z.object({
  total: z.number(),
  successful: z.number(),
  invalid: z.number(),
  csv: z.string(),
  model_version: z.string(),
  rows: z.array(
    z.object({
      row: z.number(),
      input: z.record(z.string(), z.string().nullable()),
      status: z.enum(["success", "invalid"]),
      prediction: predictionSchema.nullable(),
      errors: z.array(z.string()),
    }),
  ),
});
const features = Object.keys(defaults);
export default function BatchWorkspace() {
  const [file, setFile] = useState<File | null>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [progress, setProgress] = useState(0),
    [drag, setDrag] = useState(false);
  const [filter, setFilter] = useState("all"),
    [order, setOrder] = useState("row"),
    [page, setPage] = useState(1),
    [clientError, setClientError] = useState("");
  const chooser = useRef<HTMLInputElement>(null);
  const preview = useMutation({
    mutationFn: (selected: File) => {
      const form = new FormData();
      form.append("file", selected);
      return api("batch/preview", previewSchema, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: (result) =>
      setMapping(
        Object.fromEntries(
          features.map((feature) => [
            feature,
            result.headers.includes(feature) ? feature : "",
          ]),
        ),
      ),
  });
  const batch = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append("file", file!);
      form.append("mapping", JSON.stringify(mapping));
      return uploadApi("predict/batch", batchSchema, form, setProgress);
    },
    onSuccess: () => {
      setPage(1);
      setFilter("all");
    },
  });
  function choose(selected?: File) {
    if (!selected) return;
    batch.reset();
    preview.reset();
    setClientError("");
    setMapping({});
    setProgress(0);
    if (
      !selected.name.toLowerCase().endsWith(".csv") ||
      selected.size > 2 * 1024 * 1024 ||
      !selected.size
    ) {
      setFile(null);
      setClientError(
        "Choose a non-empty CSV no larger than 2 MiB. Each batch is limited to 250 data rows.",
      );
      return;
    }
    setFile(selected);
    preview.mutate(selected);
  }
  const rows = useMemo(() => {
    const list = [...(batch.data?.rows || [])].filter(
      (row) =>
        filter === "all" ||
        row.status === filter ||
        row.prediction?.class_id === filter,
    );
    return list.sort((a, b) =>
      order === "confidence"
        ? (b.prediction?.confidence ?? -1) - (a.prediction?.confidence ?? -1)
        : a.row - b.row,
    );
  }, [batch.data, filter, order]);
  const mapped =
    preview.data &&
    features.every((f) => mapping[f]) &&
    new Set(Object.values(mapping)).size === features.length;
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="WORKSPACE / BATCH PROCESSING"
        title="Many scenarios. Every row accounted for."
        description="Preview and map your CSV, validate each row, then run genuine batch inference."
      >
        <button
          className="button"
          onClick={() =>
            downloadText(
              "roadsentinel-template.csv",
              `${features.join(",")}\n${Object.values(defaults).join(",")}\n`,
              "text/csv",
            )
          }
        >
          <Download size={15} /> Download template
        </button>
      </PageTitle>
      <Limitation>
        Maximum 2 MiB / 250 rows. Inputs are numeric model codes; speed units
        and severity meanings remain unverified. Batch exploration is not added
        to saved prediction history.
      </Limitation>
      <Panel
        title="01 / Upload & inspect"
        subtitle="UTF-8 CSV · unique headers · original input columns preserved"
      >
        <div
          className={`upload-zone ${drag ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            choose(e.dataTransfer.files[0]);
          }}
        >
          <UploadCloud size={31} />
          <h3>{file ? file.name : "Drop a CSV to begin"}</h3>
          <p>
            {file
              ? `${(file.size / 1024).toFixed(1)} KiB · ${preview.data ? `${preview.data.row_count} data rows` : "Checking structure…"}`
              : "Upload actual scenarios. Results are never substituted with sample rows."}
          </p>
          <input
            hidden
            ref={chooser}
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose CSV file"
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <button
            className="button"
            onClick={() => chooser.current?.click()}
            disabled={batch.isPending}
          >
            <FileSpreadsheet size={15} />
            {file ? "Choose another file" : "Browse CSV files"}
          </button>
        </div>
        {clientError && (
          <p role="alert" className="field-error">
            {clientError}
          </p>
        )}
        {preview.isPending && (
          <p className="processing-note" role="status">
            <LoaderCircle size={15} className="spin" />
            Reading actual CSV structure…
          </p>
        )}
        {preview.error && (
          <Failure
            error={preview.error}
            retry={() => file && preview.mutate(file)}
          />
        )}
        {preview.data && (
          <>
            <details className="details-panel" open>
              <summary>
                Preview first {preview.data.preview.length} rows
              </summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {preview.data.headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.preview.map((row, i) => (
                      <tr key={i}>
                        {preview.data.headers.map((header) => (
                          <td key={header}>{row[header] ?? "(missing)"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <div className="form-section">
              <h3>02 / MAP THE SEVEN MODEL FEATURES</h3>
              <div className="mapping-grid">
                {features.map((feature) => (
                  <div className="field" key={feature}>
                    <label htmlFor={`map-${feature}`}>{labels[feature]}</label>
                    <select
                      id={`map-${feature}`}
                      value={mapping[feature] || ""}
                      onChange={(e) => {
                        setMapping((current) => ({
                          ...current,
                          [feature]: e.target.value,
                        }));
                        batch.reset();
                      }}
                    >
                      <option value="">Select CSV column</option>
                      {preview.data!.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button
                className="button primary"
                disabled={!mapped || batch.isPending}
                onClick={() => {
                  setProgress(0);
                  batch.mutate();
                }}
              >
                {batch.isPending ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <UploadCloud size={16} />
                )}
                Run {preview.data.row_count} scenarios
              </button>
              {!mapped && (
                <p className="field-error">
                  Map every feature to a different CSV column.
                </p>
              )}
              {batch.isPending && (
                <div role="status">
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="CSV upload progress"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <p className="processing-note">
                    {progress < 100
                      ? `Uploading request: ${progress}%`
                      : "Upload complete. Backend validation and inference are running; row progress is not streamed."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {batch.error && (
          <Failure error={batch.error} retry={() => batch.mutate()} />
        )}
      </Panel>
      {batch.data && (
        <Panel
          title="03 / Processing results"
          subtitle={`Actual model: ${batch.data.model_version}`}
          action={
            <button
              className="button small"
              onClick={() =>
                downloadText(
                  "roadsentinel-batch-results.csv",
                  batch.data!.csv,
                  "text/csv",
                )
              }
            >
              <Download size={14} /> Export all rows
            </button>
          }
        >
          <div className="split-summary">
            <div>
              <small>INPUT ROWS</small>
              <strong>{batch.data.total}</strong>
            </div>
            <div>
              <small>SUCCESSFUL</small>
              <strong style={{ color: "var(--teal)" }}>
                {batch.data.successful}
              </strong>
            </div>
            <div>
              <small>INVALID</small>
              <strong
                style={{
                  color: batch.data.invalid ? "var(--amber)" : "var(--muted)",
                }}
              >
                {batch.data.invalid}
              </strong>
            </div>
          </div>
          <div
            className="bar-track"
            aria-label={`${batch.data.successful} successful and ${batch.data.invalid} invalid rows`}
          >
            <div
              className="bar-fill"
              style={{
                width: `${(batch.data.successful / batch.data.total) * 100}%`,
              }}
            />
          </div>
          <div className="filters" style={{ margin: "22px 0" }}>
            <div className="field">
              <label htmlFor="batch-status">Filter results</label>
              <select
                id="batch-status"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All rows</option>
                <option value="success">Successful</option>
                <option value="invalid">Invalid</option>
                {Array.from(
                  new Set(
                    batch.data.rows.flatMap((row) =>
                      row.prediction ? [row.prediction.class_id] : [],
                    ),
                  ),
                ).map((id) => (
                  <option key={id} value={id}>
                    Class {id}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="batch-order">Sort by</label>
              <select
                id="batch-order"
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value);
                  setPage(1);
                }}
              >
                <option value="row">Original row number</option>
                <option value="confidence">Confidence descending</option>
              </select>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CSV row</th>
                  <th>Status</th>
                  <th>Model output</th>
                  <th>Confidence</th>
                  <th>Validation details</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 10, page * 10).map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>
                      <Status tone={row.status === "success" ? "good" : "warn"}>
                        {row.status}
                      </Status>
                    </td>
                    <td>{row.prediction?.severity ?? "—"}</td>
                    <td>
                      {row.prediction
                        ? `${(row.prediction.confidence * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td style={{ whiteSpace: "normal", minWidth: 170 }}>
                      {row.errors.join("; ") || "Passed operational validation"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {rows.length} matching rows · page {page} of{" "}
              {Math.max(1, Math.ceil(rows.length / 10))}
            </span>
            <div className="actions">
              <button
                className="button small"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="button small"
                disabled={page * 10 >= rows.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
