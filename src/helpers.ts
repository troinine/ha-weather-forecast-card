import { HomeAssistant, TimeFormat } from "custom-card-helpers";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import * as SunCalc from "suncalc";
import memoizeOne from "memoize-one";
import { SuntimesInfo } from "./types";

export interface HourParts {
  hour: string;
  suffix?: string;
}

export interface TimeParts {
  time: string;
  suffix?: string;
}

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

export const formatDay = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): string => {
  return toDate(datetime).toLocaleDateString(getLocale(hass), {
    weekday: "short",
  });
};

export const formatDayOfMonth = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): string => {
  return toDate(datetime).toLocaleDateString(getLocale(hass), {
    day: "numeric",
  });
};

export const formatHourParts = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): HourParts => {
  const date = toDate(datetime);
  const locale = getLocale(hass);
  const isAmPm = useAmPm(hass);

  // Try to extract parts using Intl.DateTimeFormat for proper locale handling
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      hour12: isAmPm,
    });
    const parts = formatter.formatToParts(date);

    const hourPart = parts.find((p) => p.type === "hour");
    const dayPeriodPart = parts.find((p) => p.type === "dayPeriod");

    if (hourPart) {
      if (dayPeriodPart) {
        return {
          hour: hourPart.value,
          suffix: dayPeriodPart.value,
        };
      }

      const hourIndex = parts.indexOf(hourPart);
      const suffixLiteral = parts
        .slice(hourIndex + 1)
        .filter((p) => p.type === "literal")
        .map((p) => p.value)
        .join("");

      if (suffixLiteral && suffixLiteral.trim()) {
        return {
          hour: hourPart.value,
          suffix: suffixLiteral.trim(),
        };
      }

      return { hour: hourPart.value };
    }
  } catch {
    // Fallback below
  }

  // Fallback: extract numeric portion from formatted string
  const fullTime = date.toLocaleTimeString(locale, {
    hour: "numeric",
    hour12: isAmPm,
  });
  const numericMatch = fullTime.match(/\d+/);
  const hour = numericMatch ? numericMatch[0] : fullTime;
  const suffix = fullTime.replace(/\d+\s*/, "").trim();

  return suffix ? { hour, suffix } : { hour };
};

export const formatTimeParts = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): TimeParts => {
  const date = toDate(datetime);
  const locale = getLocale(hass);
  const isAmPm = useAmPm(hass);

  // Try to extract parts using Intl.DateTimeFormat for proper locale handling
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: isAmPm,
    });
    const parts = formatter.formatToParts(date);

    const hourPart = parts.find((p) => p.type === "hour");
    const minutePart = parts.find((p) => p.type === "minute");
    const dayPeriodPart = parts.find((p) => p.type === "dayPeriod");

    if (hourPart && minutePart) {
      const hourIndex = parts.indexOf(hourPart);
      const minuteIndex = parts.indexOf(minutePart);
      const separator = parts
        .slice(hourIndex + 1, minuteIndex)
        .map((p) => p.value)
        .join("");

      const time = `${hourPart.value}${separator}${minutePart.value}`;

      if (dayPeriodPart) {
        return {
          time,
          suffix: dayPeriodPart.value,
        };
      }

      const suffixLiteral = parts
        .slice(minuteIndex + 1)
        .filter((p) => p.type === "literal")
        .map((p) => p.value)
        .join("");

      if (suffixLiteral && suffixLiteral.trim()) {
        return {
          time,
          suffix: suffixLiteral.trim(),
        };
      }

      return { time };
    }
  } catch {
    // Fallback below
  }

  // Fallback: extract time portion from formatted string
  const fullTime = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: isAmPm,
  });
  const timeMatch = fullTime.match(/\d+[:.]\d+/);
  const time = timeMatch ? timeMatch[0] : fullTime;
  const suffix = fullTime.replace(/\d+[:.]\d+\s*/, "").trim();

  return suffix ? { time, suffix } : { time };
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
