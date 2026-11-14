"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import {
  defaults,
  labels,
  options,
  readSharedScenario,
  Scenario,
  scenarioSchema,
} from "@/lib/contracts";
import Speedometer from "./Speedometer";
export { options } from "@/lib/contracts";
export const presets = [
  {
    name: "Rainy rural night",
    values: {
      ...defaults,
      speed_limit: 60,
      weather_conditions: 2,
      road_surface_conditions: 2,
      light_conditions: 6,
      urban_or_rural_area: 2,
      hour: 22,
    },
  },
  {
    name: "Urban afternoon",
    values: { ...defaults, speed_limit: 20, hour: 15 },
  },
  { name: "Clear residential", values: { ...defaults } },
];
export function ControlledScenario({
  value,
  onChange,
  id,
  disabled = false,
}: {
  value: Scenario;
  onChange: (v: Scenario) => void;
  id: string;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      style={{ border: 0, padding: 0, minWidth: 0 }}
    >
      {value.speed_limit > 0 && (
        <Speedometer
          value={value.speed_limit}
          min={20}
          max={70}
          unit="mph"
          compact
        />
      )}
      <div className="preset-row">
        {presets.map((p) => (
          <button
            type="button"
            className="preset"
            key={p.name}
            onClick={() => onChange(p.values)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="field-grid">
        {Object.keys(defaults).map((key) => (
          <div className="field" key={key}>
            <label htmlFor={`${id}-${key}`}>{labels[key]}</label>
            <select
              id={`${id}-${key}`}
              value={value[key as keyof Scenario]}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value) })
              }
            >
              {options[key].map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="chart-annotation">
        The posted limit is not actual driving speed. Time uses the local clock.
        Presets are hypothetical road conditions.
      </p>
    </fieldset>
  );
}
export default function ScenarioForm({
  onSubmit,
  onChange,
  pending,
  submitLabel = "Run model prediction",
  initial = defaults,
  allowSave = true,
  allowShared = false,
}: {
  onSubmit: (scenario: Scenario, save: boolean) => void;
  onChange?: () => void;
  pending: boolean;
  submitLabel?: string;
  initial?: Scenario;
  allowSave?: boolean;
  allowShared?: boolean;
}) {
  const params = useSearchParams();
  const [value, setValue] = useState(() => {
      const shared = allowShared ? params?.get("scenario") : null;
      return (shared ? readSharedScenario(shared) : null) ?? initial;
    }),
    [save, setSave] = useState(false);
  return (
    <form
      className="scenario-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(scenarioSchema.parse(value), save);
      }}
    >
      <ControlledScenario
        id={submitLabel}
        value={value}
        disabled={pending}
        onChange={(v) => {
          setValue(v);
          onChange?.();
        }}
      />
      {allowSave && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={save}
            disabled={pending}
            onChange={(e) => setSave(e.target.checked)}
          />
          <span>
            Save to history
            <br />
            <small>
              Temporary server history for this browser. Export results to keep
              them.
            </small>
          </span>
        </label>
      )}
      <div className="actions">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {pending ? "Estimating injury severity…" : submitLabel}
        </button>
      </div>
      {pending && (
        <p role="status" className="chart-annotation">
          The free service may take about a minute to wake up. Your request is
          running.
        </p>
      )}
    </form>
  );
}
