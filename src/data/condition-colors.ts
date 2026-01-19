import { ConditionColorMap } from "../types";

/**
 * Default condition colors based on hourly-weather card.
 * These represent the color of the sky/weather condition.
 */
export const DEFAULT_CONDITION_COLORS: ConditionColorMap = {
  "clear-night": "#000",
  cloudy: "#777",
  fog: "#777", // same as cloudy
  hail: "#2b5174",
  lightning: "#44739d", // same as rainy
  "lightning-rainy": "#44739d", // same as rainy
  partlycloudy: "#b3dbff",
  pouring: "#44739d", // same as rainy
  rainy: "#44739d",
  snowy: "#fff",
  "snowy-rainy": "#b3dbff", // same as partlycloudy
  sunny: "#90cbff",
  windy: "#90cbff", // same as sunny
  "windy-variant": "#90cbff", // same as sunny
  exceptional: "#ff9d00",
};

/**
 * Gets the color for a weather condition, falling back to defaults
 * and similar conditions as needed.
 */
export function getConditionColor(
  condition: string,
  customColors?: ConditionColorMap
): { foreground?: string; background?: string } {
  const normalizedCondition = condition.toLowerCase().replace(/_/g, "-");

  // Check custom colors first
  if (customColors?.[normalizedCondition]) {
    const color = customColors[normalizedCondition];
    if (typeof color === "string") {
      return { background: color };
    }
    return color;
  }

  // Fall back to default
  const defaultColor = DEFAULT_CONDITION_COLORS[normalizedCondition];
  if (defaultColor) {
    return { background: typeof defaultColor === "string" ? defaultColor : defaultColor.background };
  }

  // No color found
  return {};
}
