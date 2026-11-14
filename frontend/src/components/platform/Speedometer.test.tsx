import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Speedometer from "./Speedometer";

it("exposes a keyboard-operable slider and preserves the feature label", () => {
  const update = vi.fn();
  render(<Speedometer value={30} onChange={update} />);
  expect(screen.getByRole("img")).toHaveAccessibleName(
    "Posted speed limit: 30 mph",
  );
  const slider = screen.getByRole("slider");
  expect(slider).toHaveAccessibleName("Posted speed limit");
  fireEvent.change(slider, { target: { value: "60" } });
  expect(update).toHaveBeenCalledWith(60);
  expect(screen.getByText(/not a safe driving speed/)).toBeInTheDocument();
});
