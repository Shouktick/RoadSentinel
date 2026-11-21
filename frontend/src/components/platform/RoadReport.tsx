"use client";
import { useMemo, useState } from "react";
import { useRideStorage } from "./useRideStorage";
import { z } from "zod";
import { Panel } from "./ui";

const groups = {
  "Road condition": ["Dry", "Wet", "Slippery", "Damaged road"],
  Visibility: ["Clear", "Foggy", "Heavy rain", "Poor visibility"],
  Traffic: ["Light", "Moderate", "Heavy", "Traffic jam"],
  Hazards: [
    "Pothole",
    "Road obstruction",
    "Animal crossing",
    "Road construction",
    "Accident ahead",
    "Other hazard",
  ],
};
const storageKey = "roadsentinel-passenger-report";
const reportSchema = z.object({ at: z.number(), items: z.array(z.string()) });
export default function RoadReport() {
  const [selection, setSelection] = useState<string[]>([]);
  const [raw, writeReport] = useRideStorage("sessionStorage", storageKey);
  const saved = useMemo(() => {
    try {
      return reportSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [raw]);
  const [error, setError] = useState("");
  function toggle(value: string, group: string) {
    setSelection((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      const exclusive =
        group === "Traffic"
          ? groups.Traffic
          : group === "Road condition" && ["Dry", "Wet"].includes(value)
            ? ["Dry", "Wet"]
            : group === "Visibility"
              ? value === "Clear"
                ? groups.Visibility
                : ["Clear"]
              : [];
      return [...prev.filter((v) => !exclusive.includes(v)), value];
    });
  }
  function save() {
    const report = { at: Date.now(), items: selection };
    try {
      writeReport(JSON.stringify(report));
      setSelection([]);
      setError("");
    } catch {
      setError("Could not save in this tab. Your selections are still here.");
    }
  }
  return (
    <div id="ride-report">
      <Panel
        title="Report road conditions"
        subtitle="Tap what you can see. Your latest report stays in this browser tab."
      >
        {Object.entries(groups).map(([group, items]) => (
          <fieldset className="ride-options" key={group}>
            <legend>{group}</legend>
            {items.map((v) => (
              <button
                key={v}
                aria-pressed={selection.includes(v)}
                onClick={() => toggle(v, group)}
              >
                {v}
              </button>
            ))}
          </fieldset>
        ))}
        <button
          className="button primary"
          disabled={!selection.length}
          onClick={save}
        >
          Save road report
        </button>
        <div role="status">
          {error ||
            (saved && (
              <p>
                Saved in this tab at {new Date(saved.at).toLocaleString()}. You
                reported: {saved.items.join(", ")}.
              </p>
            ))}
        </div>
      </Panel>
    </div>
  );
}
