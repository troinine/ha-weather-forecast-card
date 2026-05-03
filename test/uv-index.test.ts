import { describe, expect, it } from "vitest";
import { getUvIndexColor } from "../src/data/uv-index";

describe("getUvIndexColor", () => {
  it("returns default property name when value is null", () => {
    expect(getUvIndexColor(null)).toBe("--wfc-chart-uv-bar-color");
  });

  it.each([
    [0, "--wfc-uv-low"],
    [2, "--wfc-uv-low"],
    [3, "--wfc-uv-moderate"],
    [5, "--wfc-uv-moderate"],
    [6, "--wfc-uv-high"],
    [7, "--wfc-uv-high"],
    [8, "--wfc-uv-very-high"],
    [10, "--wfc-uv-very-high"],
    [11, "--wfc-uv-extreme"],
    [15, "--wfc-uv-extreme"],
  ] as const)("maps UV %i to %s", (value, expected) => {
    expect(getUvIndexColor(value)).toBe(expected);
  });
});
