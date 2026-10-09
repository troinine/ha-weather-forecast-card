import { logger } from "../logger";
import { ForecastAttribute, ForecastEvent } from "./weather";

/**
 * Stale-while-revalidate cache for forecast events.
 *
 * The forecast only arrives through a websocket subscription, and on a busy
 * dashboard that reply queues behind every other message the frontend is
 * loading (entity registry, states, templates), so the forecast can land a
 * second or more after the rest of the card. Seeding the card from the last
 * event it saw lets it render immediately; the live subscription replaces the
 * cached data as soon as it arrives.
 *
 * Entries live in localStorage so a new tab or a reload benefits too. Every
 * access is guarded: storage can be unavailable (private mode, blocked site
 * data) or full, and the cache must never break the card.
 */

const KEY_PREFIX = "weather-forecast-card:forecast:";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

interface CachedForecast {
  savedAt: number;
  event: ForecastEvent;
}

const cacheKey = (entityId: string, type: ForecastEvent["type"]) =>
  `${KEY_PREFIX}${entityId}:${type}`;

const startOfLocalDay = (now: number) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Drops forecast entries that are already in the past, so a cached copy never
 * shows an hour or a day that has gone by: hourly entries must end after now,
 * daily-like entries must not start before today.
 */
export const trimPastForecast = (
  event: ForecastEvent,
  now: number = Date.now()
): ForecastEvent | undefined => {
  if (!event.forecast?.length) {
    return undefined;
  }

  // An hourly entry is stamped with the START of its hour, so it is current
  // until an hour later; a daily one is current for the whole local day.
  const keep =
    event.type === "hourly"
      ? (t: number) => t > now - HOUR_MS
      : (t: number) => t >= startOfLocalDay(now);

  const forecast = event.forecast.filter((item: ForecastAttribute) => {
    const t = Date.parse(item.datetime);
    return Number.isNaN(t) || keep(t);
  });

  if (!forecast.length) {
    return undefined;
  }

  return { ...event, forecast: forecast as ForecastEvent["forecast"] };
};

export const readCachedForecast = (
  entityId: string,
  type: ForecastEvent["type"],
  now: number = Date.now()
): ForecastEvent | undefined => {
  try {
    const raw = window.localStorage.getItem(cacheKey(entityId, type));
    if (!raw) {
      return undefined;
    }

    const cached = JSON.parse(raw) as CachedForecast;
    if (
      typeof cached?.savedAt !== "number" ||
      now - cached.savedAt > MAX_AGE_MS ||
      cached.event?.type !== type
    ) {
      return undefined;
    }

    return trimPastForecast(cached.event, now);
  } catch (error) {
    logger.debug("Could not read cached forecast:", error);
    return undefined;
  }
};

export const writeCachedForecast = (
  entityId: string,
  event: ForecastEvent,
  now: number = Date.now()
): void => {
  try {
    if (!event.forecast?.length) {
      return;
    }

    const entry: CachedForecast = { savedAt: now, event };
    window.localStorage.setItem(
      cacheKey(entityId, event.type),
      JSON.stringify(entry)
    );
  } catch (error) {
    logger.debug("Could not cache forecast:", error);
  }
};
