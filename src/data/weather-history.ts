import type { ForecastAttribute, WeatherEntity } from "./weather";
import type { ExtendedHomeAssistant } from "../types";

const UNAVAILABLE_STATES = new Set(["unknown", "unavailable"]);

type HistoryAttributes = Record<string, unknown>;

export interface HistoricalWeatherState {
  state: string;
  attributes: HistoryAttributes;
  timestamp: number;
}

type HistoryResponse = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asWindBearing = (value: unknown): number | string | undefined =>
  typeof value === "string" || asFiniteNumber(value) !== undefined
    ? (value as number | string)
    : undefined;

const parseCompressedState = (
  value: unknown,
  inheritedAttributes: HistoryAttributes
): HistoricalWeatherState | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const state = value.s;
  const lastUpdated = value.lu;

  if (
    typeof state !== "string" ||
    typeof lastUpdated !== "number" ||
    !Number.isFinite(lastUpdated)
  ) {
    return undefined;
  }

  const attributes = isRecord(value.a) ? value.a : inheritedAttributes;

  return {
    state,
    attributes,
    timestamp: lastUpdated * 1000,
  };
};

const parseFullState = (value: unknown): HistoricalWeatherState | undefined => {
  if (!isRecord(value) || typeof value.state !== "string") {
    return undefined;
  }

  const timestampValue = value.last_updated ?? value.last_changed;
  if (typeof timestampValue !== "string") {
    return undefined;
  }

  const timestamp = Date.parse(timestampValue);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return {
    state: value.state,
    attributes: isRecord(value.attributes) ? value.attributes : {},
    timestamp,
  };
};

/**
 * Decodes both the current compressed history WebSocket response and the
 * legacy/full state representation. Missing compressed attributes inherit the
 * last supplied attribute object, matching Home Assistant's history encoding.
 */
export const parseWeatherHistoryResponse = (
  response: unknown,
  entityId: string
): HistoricalWeatherState[] => {
  if (!isRecord(response)) {
    return [];
  }

  const values = response[entityId];
  if (!Array.isArray(values)) {
    return [];
  }

  const result: HistoricalWeatherState[] = [];
  let inheritedAttributes: HistoryAttributes = {};

  for (const value of values) {
    const compressed = parseCompressedState(value, inheritedAttributes);
    const parsed = compressed ?? parseFullState(value);

    if (!parsed || !Number.isFinite(parsed.timestamp)) {
      continue;
    }

    if (
      isRecord(value) &&
      isRecord(value.a) &&
      Object.keys(value.a).length > 0
    ) {
      inheritedAttributes = value.a;
    } else if (
      isRecord(value) &&
      isRecord(value.attributes) &&
      Object.keys(value.attributes).length > 0
    ) {
      inheritedAttributes = value.attributes;
    }

    result.push(parsed);
  }

  return result.sort((left, right) => left.timestamp - right.timestamp);
};

export const fetchWeatherHistory = async (
  hass: ExtendedHomeAssistant,
  entityId: string,
  startTime: Date,
  endTime: Date
): Promise<HistoricalWeatherState[]> => {
  const response = await hass.callWS<HistoryResponse>({
    type: "history/history_during_period",
    entity_ids: [entityId],
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    significant_changes_only: false,
    minimal_response: false,
    no_attributes: false,
  });

  return parseWeatherHistoryResponse(response, entityId);
};

const stateToForecast = (
  state: HistoricalWeatherState,
  datetime: string
): ForecastAttribute | undefined => {
  if (UNAVAILABLE_STATES.has(state.state)) {
    return undefined;
  }

  const temperature = asFiniteNumber(state.attributes.temperature);
  if (temperature === undefined) {
    return undefined;
  }

  return {
    datetime,
    temperature,
    condition: state.state,
    apparent_temperature: asFiniteNumber(state.attributes.apparent_temperature),
    humidity: asFiniteNumber(state.attributes.humidity),
    pressure: asFiniteNumber(state.attributes.pressure),
    wind_speed: asFiniteNumber(state.attributes.wind_speed),
    wind_bearing: asWindBearing(state.attributes.wind_bearing),
    uv_index: asFiniteNumber(state.attributes.uv_index),
  };
};

/**
 * Converts irregular recorder updates into fixed-width slots aligned to the
 * first forecast timestamp. Absolute intervals preserve repeated/missing local
 * clock hours across DST and also retain non-whole-hour timezone alignment.
 */
export const bucketWeatherHistory = (
  states: HistoricalWeatherState[],
  boundaryTimestamp: number,
  intervalHours = 1
): ForecastAttribute[] => {
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  const buckets = new Map<
    number,
    { timestamp: number; forecast: ForecastAttribute }
  >();

  for (const state of states) {
    if (
      state.timestamp >= boundaryTimestamp ||
      !Number.isFinite(state.timestamp)
    ) {
      continue;
    }

    const slotTimestamp =
      boundaryTimestamp +
      Math.floor((state.timestamp - boundaryTimestamp) / intervalMs) *
        intervalMs;
    const forecast = stateToForecast(
      state,
      new Date(slotTimestamp).toISOString()
    );

    if (!forecast) {
      continue;
    }

    const existing = buckets.get(slotTimestamp);
    if (!existing || state.timestamp >= existing.timestamp) {
      buckets.set(slotTimestamp, {
        timestamp: state.timestamp,
        forecast,
      });
    }
  }

  return [...buckets.values()]
    .sort(
      (left, right) =>
        Date.parse(left.forecast.datetime) - Date.parse(right.forecast.datetime)
    )
    .map(({ forecast }) => forecast);
};

export const createCurrentWeatherTimelineEntry = (
  weatherEntity: WeatherEntity,
  datetime: string,
  fallbackTemperature?: number
): ForecastAttribute | undefined => {
  const temperature =
    asFiniteNumber(weatherEntity.attributes.temperature) ?? fallbackTemperature;

  if (temperature === undefined) {
    return undefined;
  }

  return {
    datetime,
    temperature,
    condition: UNAVAILABLE_STATES.has(weatherEntity.state)
      ? undefined
      : weatherEntity.state,
    apparent_temperature: asFiniteNumber(
      weatherEntity.attributes.apparent_temperature
    ),
    humidity: asFiniteNumber(weatherEntity.attributes.humidity),
    pressure: asFiniteNumber(weatherEntity.attributes.pressure),
    wind_speed: asFiniteNumber(weatherEntity.attributes.wind_speed),
    wind_bearing: asWindBearing(weatherEntity.attributes.wind_bearing),
    uv_index: asFiniteNumber(weatherEntity.attributes.uv_index),
  };
};
