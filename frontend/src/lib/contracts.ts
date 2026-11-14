import { z } from "zod";
import domain from "./domain.json";

export const options = domain.options as unknown as Record<
  string,
  [number, string][]
>;
export const labels: Record<string, string> = domain.labels;
export const definitions: Record<string, string> = domain.definitions;
const category = (name: string) =>
  z
    .number()
    .int()
    .refine(
      (value) => options[name].some(([code]) => value === code),
      "Choose a documented option",
    );
export const scenarioSchema = z
  .object({
    speed_limit: category("speed_limit"),
    weather_conditions: category("weather_conditions"),
    road_surface_conditions: category("road_surface_conditions"),
    light_conditions: category("light_conditions"),
    road_type: category("road_type"),
    urban_or_rural_area: category("urban_or_rural_area"),
    hour: category("hour"),
    day_of_week: category("day_of_week"),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;
export const defaults: Scenario = domain.defaults;
export const explanationSchema = z.object({
  class_id: z.string(),
  base_value: z.number(),
  output_value: z.number(),
  output_space: z.string(),
  method: z.string(),
  contributions: z.array(
    z.object({
      feature: z.string(),
      value: z.number(),
      contribution: z.number(),
    }),
  ),
});
// Historical payloads retain their ORIGINAL fields, labels and version. Never remap them.
export const predictionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  model_version: z.string(),
  artifact_sha256: z.string().optional(),
  code_version: z.string().optional(),
  schema_version: z.number().optional(),
  scenario: z.record(z.string(), z.number()),
  class_id: z.string(),
  severity: z.string(),
  semantics_verified: z.boolean(),
  class_definitions: z.record(z.string(), z.string()).optional(),
  speed_unit: z.string().optional(),
  probabilities: z.array(
    z.object({
      class_id: z.string(),
      label: z.string(),
      probability: z.number().min(0).max(1),
    }),
  ),
  confidence: z.number().min(0).max(1),
  calibrated: z.boolean(),
  risk_score: z.number().nullable(),
  latency_ms: z.number().min(0),
  explanation: explanationSchema.nullable(),
  explanation_status: z.string(),
  saved: z.boolean(),
});
export type Prediction = z.infer<typeof predictionSchema>;
export const healthSchema = z.object({
  status: z.string(),
  model_available: z.boolean(),
  model_version: z.string().nullable(),
  ready: z.boolean(),
  severity_ready: z.boolean(),
  database_available: z.boolean(),
  history_durable: z.boolean(),
  semantics_verified: z.boolean(),
  shap_available: z.boolean(),
});
export const metadataSchema = z.object({
  model_version: z.string(),
  artifact_sha256: z.string(),
  algorithm: z.string(),
  feature_order: z.array(z.string()),
  classes: z.array(z.object({ id: z.string(), label: z.string() })),
  semantics_verified: z.boolean(),
  speed_unit: z.string(),
  calibrated: z.boolean(),
  provenance: z.string(),
  coverage: z.string(),
  target: z.string(),
  limitations: z.array(z.string()),
  class_definitions: z.record(z.string(), z.string()),
});
const reportRow = z.object({
  precision: z.number(),
  recall: z.number(),
  "f1-score": z.number(),
  support: z.number(),
});
export const metricsSchema = z
  .object({
    model_version: z.string(),
    dataset_sha256: z.string(),
    evaluation_set: z.string(),
    test_size: z.number(),
    accuracy: z.number(),
    macro_f1: z.number(),
    balanced_accuracy: z.number(),
    log_loss: z.number(),
    brier_multiclass: z.number(),
    ece_10_bins: z.number(),
    class_labels: z.array(z.string()),
    confusion_matrix: z.array(z.array(z.number())),
    classification_report: z.object({
      "Fatal injury": reportRow,
      "Serious injury": reportRow,
      "Slight injury": reportRow,
    }),
    split: z.string(),
    selected_model: z.string(),
    rule: z.string(),
    comparison: z.array(
      z.object({
        candidate: z.string(),
        validation_macro_f1: z.number(),
        selected_log_loss: z.number(),
        calibration_selected: z.boolean(),
      }),
    ),
  })
  .passthrough();
export function convertSpeed(
  value: number,
  from: "km/h" | "mph",
  to: "km/h" | "mph",
) {
  return from === to
    ? value
    : from === "mph"
      ? value * 1.609344
      : value / 1.609344;
}
export function shareScenario(scenario: Scenario) {
  return encodeURIComponent(JSON.stringify(scenarioSchema.parse(scenario)));
}
export function readSharedScenario(value: string): Scenario | null {
  try {
    return scenarioSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
export function inputLabel(key: string, value: number) {
  return options[key]?.find(([code]) => code === value)?.[1] ?? String(value);
}
export const scopeNote =
  "These percentages estimate injury severity for this scenario using patterns in Great Britain's recorded injury crashes. They do not measure the chance of a crash.";
export const performanceNote =
  "Limited ability to identify severe injuries: in the 2023 test, this model selected slight injury for every crash, missing all serious and fatal outcomes. Use the full probability distribution for exploration, never to judge safety.";
