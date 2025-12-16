import { HomeAssistant, TimeFormat } from "custom-card-helpers";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import * as SunCalc from "suncalc";
import memoizeOne from "memoize-one";
import { SuntimesInfo } from "./types";

export const createWarningText = (
  hass: HomeAssistant | undefined,
  _entity: string
): string => {
  if (!hass) {
    return "Home Assistant instance is not available.";
  }

  return hass.config.state !== STATE_NOT_RUNNING
    ? hass.localize("ui.card.common.entity_not_found")
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
