/**
 * Custom property name for UV bar / text color (--...), matching the forecast chart scale.
 * The value is rounded before bucketing so the color always matches the displayed
 * (rounded) UV index, consistent with the chart bar height.
 * Use `var(${getUvIndexColor(...)})` in CSS, or `getComputedStyle(...).getPropertyValue(getUvIndexColor(...))` for canvas.
 */
export function getUvIndexColor(value: number | null): string {
  if (value === null) {
    return "--wfc-chart-uv-bar-color";
  }
  const index = Math.round(value);
  if (index >= 11) {
    return "--wfc-uv-extreme";
  }
  if (index >= 8) {
    return "--wfc-uv-very-high";
  }
  if (index >= 6) {
    return "--wfc-uv-high";
  }
  if (index >= 3) {
    return "--wfc-uv-moderate";
  }
  return "--wfc-uv-low";
}
