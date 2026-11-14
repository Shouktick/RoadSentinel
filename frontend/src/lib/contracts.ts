import { z } from "zod";
export const healthSchema = z.object({
  status: z.string(),
  country: z.literal("India"),
  ready: z.boolean(),
  analytics_ready: z.boolean(),
  model_available: z.boolean(),
  model_version: z.string().nullable(),
  severity_ready: z.boolean(),
  database_available: z.boolean(),
  history_durable: z.boolean(),
  dataset_version: z.string().nullable(),
  code_version: z.string(),
  artifact_sha256: z.string().nullable(),
});
const classMetrics = z.object({
  precision: z.number(),
  recall: z.number(),
  "f1-score": z.number(),
  support: z.number(),
});
const evaluationSchema = z.object({
  macro_f1: z.number(),
  balanced_accuracy: z.number(),
  confusion_matrix: z.array(z.array(z.number())),
  per_class: z.record(z.string(), z.union([classMetrics, z.number()])),
  predicted_counts: z.record(z.string(), z.number()),
  n: z.number(),
  probability_quality: z.object({
    multiclass_brier_sum: z.number(),
    log_loss: z.number(),
    definition: z.string(),
  }),
});
export const metadataSchema = z.object({
  country: z.literal("India"),
  region: z.literal("Karnataka"),
  model_available: z.literal(true),
  model_version: z.string().startsWith("india-karnataka-"),
  status: z.literal("research"),
  source: z.string(),
  source_url: z.string(),
  source_sha256: z.string(),
  license: z.string(),
  license_url: z.string(),
  features: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      options: z.array(z.string()),
      default: z.string(),
    }),
  ),
  classes: z.array(z.string()),
  algorithm: z.string(),
  evaluation: evaluationSchema,
  baseline: evaluationSchema,
  split: z.record(z.string(), z.number()),
  cleaning: z.record(z.string(), z.number()),
  limitations: z.array(z.string()),
  capabilities: z.array(z.string()),
  explanation: z.object({
    method: z.string(),
    units: z.string(),
    global: z.record(
      z.string(),
      z.array(
        z.object({
          feature: z.string(),
          label: z.string(),
          mean_absolute_shap: z.number(),
        }),
      ),
    ),
  }),
});
export type ModelMetadata = z.infer<typeof metadataSchema>;
export const explanationSchema = z.object({
  class: z.string(),
  base_value: z.number(),
  output_logit: z.number(),
  units: z.literal("logit"),
  method: z.string(),
  contributions: z.array(
    z.object({
      feature: z.string(),
      label: z.string(),
      value: z.string(),
      contribution: z.number(),
    }),
  ),
});
export const metricLabels = {
  accidents: "Reported accidents",
  fatalities: "Persons killed",
  injuries: "Persons injured",
};
export type Metric = keyof typeof metricLabels;
export const rowSchema = z.object({
  state: z.string(),
  year: z.number().int(),
  accidents: z.number().int().nonnegative(),
  fatalities: z.number().int().nonnegative().nullable(),
  injuries: z.number().int().nonnegative(),
  source_missing: z.record(z.string(), z.string()).optional(),
});
export type IndiaRow = z.infer<typeof rowSchema>;
export const indiaSchema = z.object({
  dataset_version: z.string(),
  country: z.literal("India"),
  granularity: z.literal("state_ut_year"),
  years: z.array(z.number()),
  source: z.string(),
  source_url: z.string(),
  source_sha256: z.string(),
  license: z.string(),
  license_url: z.string(),
  units: z.record(z.string(), z.string()),
  definitions: z.record(z.string(), z.string()),
  notes: z.array(z.string()),
  table_pages: z.record(z.string(), z.string()),
  records: z.array(rowSchema),
  national: z.array(
    z.object({
      year: z.number(),
      accidents: z.number(),
      fatalities: z.number(),
      injuries: z.number(),
    }),
  ),
  geography: z.object({
    source: z.string(),
    source_url: z.string(),
    source_sha256: z.string(),
    license: z.string(),
    license_url: z.string(),
    note: z.string(),
  }),
});
// Read historical payloads without relabelling their original model outputs.
export const predictionSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    model_version: z.string(),
    source_country: z.string(),
    historical_only: z.boolean(),
    explanation: explanationSchema.optional(),
    region: z.string().optional(),
    scenario: z.record(z.string(), z.unknown()),
    severity: z.string(),
    confidence: z.number(),
    speed_unit: z.string().optional(),
    probabilities: z.array(
      z.object({
        class_id: z.string(),
        label: z.string(),
        probability: z.number(),
      }),
    ),
  })
  .passthrough();
export type Prediction = z.infer<typeof predictionSchema>;
export function formatCount(value: number | null) {
  return value === null
    ? "Not reported (source dash)"
    : value.toLocaleString("en-IN");
}
export function aggregateCsv(
  rows: IndiaRow[],
  version: string,
  source: string,
) {
  const quote = (v: unknown) =>
    '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return [
    [
      "country",
      "dataset_version",
      "state_or_union_territory",
      "calendar_year",
      "reported_accidents_count",
      "persons_killed_count",
      "persons_injured_count",
      "source_missing_note",
      "source_url",
    ],
    ...rows.map((r) => [
      "India",
      version,
      r.state,
      r.year,
      r.accidents,
      r.fatalities,
      r.injuries,
      JSON.stringify(r.source_missing ?? {}),
      source,
    ]),
  ]
    .map((r) => r.map(quote).join(","))
    .join("\r\n");
}
