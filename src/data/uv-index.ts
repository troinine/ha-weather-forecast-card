/**
 * Custom property name for UV bar / text color (--...), matching the forecast chart scale.
 * Use `var(${getUvIndexColor(...)})` in CSS, or `getComputedStyle(...).getPropertyValue(getUvIndexColor(...))` for canvas.
 */
export function getUvIndexColor(value: number | null): string {
  if (value === null) {
    return "--wfc-chart-uv-bar-color";
  }
  if (value >= 11) {
    return "--wfc-uv-extreme";
  }
  if (value >= 8) {
    return "--wfc-uv-very-high";
  }
  if (value >= 6) {
    return "--wfc-uv-high";
  }
  if (value >= 3) {
    return "--wfc-uv-moderate";
  }
  return "--wfc-uv-low";
}
