export const speedRange = { min: 5, max: 150, initial: 50 };
export const assumptions = [
  {
    key: "reaction_seconds",
    label: "Reaction time",
    unit: "s",
    min: 0.5,
    max: 5,
  },
  {
    key: "deceleration_ms2",
    label: "Constant deceleration",
    unit: "m/s²",
    min: 1,
    max: 10,
  },
  {
    key: "mass_kg",
    label: "Vehicle mass",
    unit: "kg",
    min: 50,
    max: 40000,
  },
] as const;
export type Assumptions = Record<(typeof assumptions)[number]["key"], number>;

export function inRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

// Mirrors the public speed-sweep endpoint. Distances are in metres and energy in kJ.
export function physics(speed: number, inputs: Assumptions) {
  if (
    !inRange(speed, speedRange.min, speedRange.max) ||
    !assumptions.every(({ key, min, max }) => inRange(inputs[key], min, max))
  )
    return null;
  const velocity = speed / 3.6;
  const reaction = velocity * inputs.reaction_seconds;
  const braking = velocity ** 2 / (2 * inputs.deceleration_ms2);
  return {
    reaction,
    braking,
    stopping: reaction + braking,
    energy: (inputs.mass_kg * velocity ** 2) / 2000,
  };
}
