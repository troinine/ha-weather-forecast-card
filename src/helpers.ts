import { HomeAssistant, TimeFormat } from "custom-card-helpers";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import * as SunCalc from "suncalc";
import memoizeOne from "memoize-one";
import { ConditionSpan, ExtendedHomeAssistant, SuntimesInfo } from "./types";
import { ForecastAttribute } from "./data/weather";

/**
 * Get localized weather condition name
 */
export const getLocalizedConditionName = (
  hass: ExtendedHomeAssistant,
  condition: string
): string => {
  const normalizedCondition = condition.toLowerCase().replace(/_/g, "-");
  return (
    hass.localize(`component.weather.entity_component._.state.${normalizedCondition}`) ||
    condition
  );
};

// Map condition to night-aware version for grouping
const mapConditionForNight = (condition: string, isNightTime: boolean): string => {
  if (!isNightTime) return condition;
  const normalized = condition.toLowerCase().replace(/_/g, "-");
  
  const NIGHT_SAFE_CONDITIONS = new Set([
    "clear-night", "cloudy", "fog", "hail", "lightning", "lightning-rainy",
    "pouring", "rainy", "snowy", "snowy-rainy"
  ]);
  
  const NIGHT_FALLBACK_CONDITIONS = new Set([
    "sunny", "clear", "windy", "windy-variant", "partlycloudy", "exceptional"
  ]);
  
  if (NIGHT_SAFE_CONDITIONS.has(normalized)) return normalized;
  if (NIGHT_FALLBACK_CONDITIONS.has(normalized)) return "clear-night";
  return normalized;
};

export const createWarningText = (
  hass: HomeAssistant | undefined,
  entity: string
): string => {
  if (!hass) {
    return "Home Assistant instance is not available.";
  }

  return hass.config.state !== STATE_NOT_RUNNING
    ? `${hass.localize("ui.card.common.entity_not_found")}: ${entity}`
    : hass.localize("ui.panel.lovelace.warning.starting");
};

export const formatHour = (
  hass: HomeAssistant | undefined,
  datetime: string | Date,
  force24Hour = false
): string => {
  return toDate(datetime).toLocaleTimeString(getLocale(hass), {
    hour: "numeric",
    hour12: force24Hour ? false : useAmPm(hass),
  });
};

export const formatTime = (
  hass: HomeAssistant | undefined,
  datetime: string | Date,
  force24Hour = false
): string => {
  return toDate(datetime).toLocaleTimeString(getLocale(hass), {
    hour: "numeric",
    minute: "2-digit",
    hour12: force24Hour ? false : useAmPm(hass),
  });
};

export const formatDay = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): string => {
  return toDate(datetime).toLocaleDateString(getLocale(hass), {
    weekday: "short",
  });
};

export const normalizeDate = (dateString: string) => {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const useAmPm = memoizeOne(
  (hass: HomeAssistant | undefined): boolean => {
    const locale = hass?.locale;
    if (
      locale?.time_format === TimeFormat.language ||
      locale?.time_format === TimeFormat.system
    ) {
      const testLanguage =
        locale.time_format === TimeFormat.language
          ? locale.language
          : undefined;
      const test = new Date("January 1, 2023 22:00:00").toLocaleString(
        testLanguage
      );
      return test.includes("10");
    }

    return locale?.time_format === TimeFormat.am_pm;
  }
);

export const getLocale = (hass: HomeAssistant | undefined): string => {
  return hass?.locale?.language || navigator.language || "en";
};

export const toDate = (datetime: string | Date): Date => {
  return typeof datetime === "string" ? new Date(datetime) : datetime;
};

export const getSuntimesInfo = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): SuntimesInfo | null => {
  const { latitude, longitude } = hass?.config || {};
  if (!latitude || !longitude) {
    return null;
  }

  const date = toDate(datetime);
  const times = SunCalc.getTimes(date, latitude, longitude);

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    isNightTime: date < times.sunrise || date > times.sunset,
  };
};

export const average = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
};

export const endOfHour = (input: Date | string): Date => {
  const d = typeof input === "string" ? new Date(input) : new Date(input);

  d.setMinutes(59, 59, 999);

  return d;
};

/**
 * Groups consecutive forecast items with the same weather condition.
 * Similar to the lovelace-hourly-weather card's condition grouping.
 *
 * @param forecast - Array of forecast items to group
 * @returns Array of condition spans with start/end indices and counts
 */
export const groupForecastByCondition = (
  forecast: ForecastAttribute[],
  hass?: HomeAssistant
): ConditionSpan[] => {
  if (!forecast || forecast.length === 0) {
    return [];
  }

  const conditionSpans: ConditionSpan[] = [];
  let currentCondition = forecast[0]?.condition || "";
  let startIndex = 0;
  let currentIsNight = hass ? getSuntimesInfo(hass, forecast[0].datetime)?.isNightTime : false;
  let currentNightAwareCondition = mapConditionForNight(currentCondition, currentIsNight);

  for (let i = 1; i < forecast.length; i++) {
    const condition = forecast[i]?.condition || "";
    const isNight = hass ? getSuntimesInfo(hass, forecast[i].datetime)?.isNightTime : false;
    const nightAwareCondition = mapConditionForNight(condition, isNight);

    // Break grouping if NIGHT-AWARE condition changes (visual appearance changes)
    const conditionChanged = nightAwareCondition !== currentNightAwareCondition;

    if (conditionChanged) {
      // End of current span, create entry
      conditionSpans.push({
        condition: currentCondition,
        startIndex,
        endIndex: i - 1,
        count: i - startIndex,
      });

      // Start new span
      currentCondition = condition;
      currentIsNight = isNight;
      currentNightAwareCondition = nightAwareCondition;
      startIndex = i;
    }
  }

  // Add the final span
  conditionSpans.push({
    condition: currentCondition,
    startIndex,
    endIndex: forecast.length - 1,
    count: forecast.length - startIndex,
  });

  return conditionSpans;
};
