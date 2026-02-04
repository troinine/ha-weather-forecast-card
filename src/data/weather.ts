import { formatNumber, HomeAssistant } from "custom-card-helpers";
import memoizeOne from "memoize-one";
import { average } from "../helpers";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import {
  CurrentWeatherAttributes,
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../types";

export enum WeatherEntityFeature {
  FORECAST_DAILY = 1,
  FORECAST_HOURLY = 2,
  FORECAST_TWICE_DAILY = 4,
}

export enum WeatherUnits {
  Temperature = "temperature_unit",
  Pressure = "pressure_unit",
  WindSpeed = "wind_speed_unit",
  Precipitation = "precipitation_unit",
  Visibility = "visibility_unit",
}

export type ModernForecastType = "hourly" | "daily" | "twice_daily";

export type ForecastType = ModernForecastType | "legacy";

export interface ForecastAttribute {
  temperature: number;
  datetime: string;
  groupEndtime?: string;
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
  humidity?: number;
  condition?: string;
  is_daytime?: boolean;
  pressure?: number;
  wind_speed?: number;
  wind_bearing?: number | string;
  uv_index?: number;
  apparent_temperature?: number;
}

export interface WeatherEntityAttributes extends HassEntityAttributeBase {
  attribution?: string;
  humidity?: number;
  forecast?: ForecastAttribute[];
  is_daytime?: boolean;
  pressure?: number;
  temperature?: number;
  visibility?: number;
  wind_bearing?: number | string;
  wind_speed?: number;
  precipitation_unit: string;
  pressure_unit: string;
  temperature_unit: string;
  visibility_unit: string;
  wind_speed_unit: string;
  wind_gust_speed?: number;
  dew_point?: number;
  uv_index?: number;
  ozone?: number;
  cloud_coverage?: number;
  apparent_temperature?: number;
}

export interface ForecastEvent {
  type: "hourly" | "daily" | "twice_daily";
  forecast: [ForecastAttribute] | null;
}

export interface WeatherEntity extends HassEntityBase {
  attributes: WeatherEntityAttributes;
}

export const CARDINAL_DIRECTIONS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

// prettier-ignore
export const CARDINAL_DIRECTIONS_DEGREES_MAP: Record<string, number> = {
  // North
  "N": 0, "P": 0, "NNE": 22.5, "NNO": 22.5, "NNW": 337.5,
  // North-East / East
  "NE": 45, "NO": 45, "ENE": 67.5, "ONO": 67.5,
  "E": 90, "O": 90, "Ø": 90,
  // South-East / South
  "ESE": 112.5, "OSO": 112.5, "SE": 135, "SO": 135,
  "SSE": 157.5, "SSO": 157.5, "S": 180,
  // South-West / West
  "SSW": 202.5, "SW": 225, "WSW": 247.5,
  "W": 270, "V": 270, "WNW": 292.5, "NW": 315,
} as const;

export const WEATHER_ATTRIBUTE_ICON_MAP: {
  [key in CurrentWeatherAttributes]: string;
} = {
  humidity: "mdi:water-percent",
  pressure: "mdi:gauge",
  wind_speed: "mdi:weather-windy-variant",
  wind_gust_speed: "mdi:weather-windy",
  visibility: "mdi:eye",
  ozone: "mdi:molecule",
  uv_index: "mdi:weather-sunny-alert",
  dew_point: "mdi:water-thermometer-outline",
  apparent_temperature: "mdi:thermometer",
  cloud_coverage: "mdi:cloud-outline",
};

export const getWindBearing = (
  degree: number | string | undefined | null
): string | undefined => {
  if (degree == null) {
    return undefined;
  }

  let degreenum = typeof degree === "number" ? degree : parseFloat(degree);

  if (isNaN(degreenum) || !isFinite(degreenum)) {
    return undefined;
  }

  degreenum %= 360;
  if (degreenum < 0) {
    degreenum += 360;
  }

  const index = Math.floor(degreenum / 22.5 + 0.5) % 16;

  return CARDINAL_DIRECTIONS[index];
};

export const getWind = (
  hass: ExtendedHomeAssistant,
  stateObj: WeatherEntity
): string | undefined => {
  const speed = stateObj.attributes.wind_speed;
  const bearing = stateObj.attributes.wind_bearing;

  if (speed === null || speed === undefined) {
    return undefined;
  }

  const speedText = hass.formatEntityAttributeValue(stateObj, "wind_speed");

  if (bearing == null) {
    return speedText;
  }

  const cardinalDirection = getWindBearing(bearing);

  if (!cardinalDirection) {
    return speedText;
  }

  const localizedDirection =
    hass.localize(
      `ui.card.weather.cardinal_direction.${cardinalDirection.toLowerCase()}`
    ) || cardinalDirection;

  return `${speedText} (${localizedDirection})`;
};

export const getWeatherUnit = (
  hass: ExtendedHomeAssistant,
  stateObj: WeatherEntity,
  measure: string
): string => {
  const config = hass.config;
  const lengthUnit = config.unit_system.length || "";
  switch (measure) {
    case "visibility":
      return stateObj.attributes.visibility_unit || lengthUnit;
    case "precipitation":
      return (
        stateObj.attributes.precipitation_unit ||
        (lengthUnit === "km" ? "mm" : "in")
      );
    case "pressure":
      return (
        stateObj.attributes.pressure_unit ||
        (lengthUnit === "km" ? "hPa" : "inHg")
      );
    case "apparent_temperature":
    case "dew_point":
    case "temperature":
    case "templow":
      return (
        stateObj.attributes.temperature_unit || config.unit_system.temperature
      );
    case "wind_speed":
      return stateObj.attributes.wind_speed_unit || `${lengthUnit}/h`;
    case "wind_gust_speed":
      return stateObj.attributes.wind_speed_unit || `${lengthUnit}/h`;
    case "ozone":
      return "DU";
    case "cloud_coverage":
    case "humidity":
    case "precipitation_probability":
      return "%";
    default:
      return (
        (measure in config.unit_system
          ? config.unit_system[measure as keyof typeof config.unit_system]
          : "") || ""
      );
  }
};

const EIGHT_HOURS = 28800000;
const DAY_IN_MILLISECONDS = 86400000;

const isForecastHourly = (
  forecast?: ForecastAttribute[]
): boolean | undefined => {
  if (forecast && forecast?.length && forecast?.length > 2) {
    const date1 = new Date(forecast[1]!.datetime);
    const date2 = new Date(forecast[2]!.datetime);
    const timeDiff = date2.getTime() - date1.getTime();

    return timeDiff < EIGHT_HOURS;
  }

  return undefined;
};

const isForecastTwiceDaily = (
  forecast?: ForecastAttribute[]
): boolean | undefined => {
  if (forecast && forecast?.length && forecast?.length > 2) {
    const date1 = new Date(forecast[1]!.datetime);
    const date2 = new Date(forecast[2]!.datetime);
    const timeDiff = date2.getTime() - date1.getTime();

    return timeDiff < DAY_IN_MILLISECONDS;
  }

  return undefined;
};

const getLegacyForecast = (
  weather_attributes?: WeatherEntityAttributes | undefined
):
  | {
      forecast: ForecastAttribute[];
      type: "daily" | "hourly" | "twice_daily";
    }
  | undefined => {
  if (weather_attributes?.forecast && weather_attributes.forecast.length > 2) {
    if (isForecastHourly(weather_attributes.forecast)) {
      return {
        forecast: weather_attributes.forecast,
        type: "hourly",
      };
    }
    if (isForecastTwiceDaily(weather_attributes.forecast)) {
      return {
        forecast: weather_attributes.forecast,
        type: "twice_daily",
      };
    }
    return { forecast: weather_attributes.forecast, type: "daily" };
  }
  return undefined;
};

export const getForecast = (
  weather_attributes?: WeatherEntityAttributes | undefined,
  forecast_event?: ForecastEvent,
  forecast_type?: ForecastType | undefined
):
  | {
      forecast: ForecastAttribute[];
      type: "daily" | "hourly" | "twice_daily";
    }
  | undefined => {
  if (forecast_type === undefined) {
    if (
      forecast_event?.type !== undefined &&
      forecast_event?.forecast &&
      forecast_event?.forecast?.length > 2
    ) {
      return { forecast: forecast_event.forecast, type: forecast_event?.type };
    }
    return getLegacyForecast(weather_attributes);
  }

  if (forecast_type === "legacy") {
    return getLegacyForecast(weather_attributes);
  }

  if (
    forecast_type === forecast_event?.type &&
    forecast_event?.forecast &&
    forecast_event?.forecast?.length > 2
  ) {
    return { forecast: forecast_event.forecast, type: forecast_type };
  }

  return undefined;
};

export const subscribeForecast = (
  hass: HomeAssistant,
  entity_id: string,
  forecast_type: ModernForecastType,
  callback: (forecastevent: ForecastEvent) => void
) =>
  hass.connection.subscribeMessage<ForecastEvent>(callback, {
    type: "weather/subscribe_forecast",
    forecast_type,
    entity_id,
  });

export const getMaxPrecipitation = (forecasts: ForecastAttribute[]): number => {
  const maxPrecipitation = Math.max(
    ...forecasts.map((f) => f.precipitation || 0)
  );

  return maxPrecipitation;
};

export const hasPrecipitation = (forecast: ForecastAttribute): boolean => {
  return (
    (forecast.precipitation !== undefined && forecast.precipitation > 0) ||
    (forecast.precipitation_probability !== undefined &&
      forecast.precipitation_probability > 0)
  );
};

export const supportsRequiredForecastFeatures = (
  weatherEntity: HassEntityBase | undefined
): boolean => {
  if (!weatherEntity || !weatherEntity.attributes) {
    return false;
  }

  const features = weatherEntity.attributes.supported_features;
  if (typeof features !== "number") {
    return false;
  }

  const hasDaily = (features & WeatherEntityFeature.FORECAST_DAILY) !== 0;
  const hasHourly = (features & WeatherEntityFeature.FORECAST_HOURLY) !== 0;

  return hasDaily && hasHourly;
};

export const formatPrecipitation = (value: number, unit: string): string => {
  if (value === undefined) {
    return "";
  }

  const precipitationMm = unit === "mm" ? value : value * 25.4;

  if (precipitationMm === 0 || precipitationMm < 0.05) {
    return "";
  }

  const formatted = unit === "in" ? value.toFixed(2) : value.toFixed(1);

  return `${formatted} ${unit}`;
};

export const getMaxPrecipitationForUnit = memoizeOne(
  (unit: string, forecastType: ForecastType): number => {
    const maxPrecipitationMm = forecastType === "hourly" ? 8 : 20;

    if (unit === "in") {
      const inches = maxPrecipitationMm / 25.4;
      return parseFloat(inches.toFixed(1));
    }

    return maxPrecipitationMm;
  }
);

export const getNormalizedWindSpeed = (
  hass: ExtendedHomeAssistant,
  stateObj: WeatherEntity,
  forecast: ForecastAttribute
): number | undefined => {
  if (forecast.wind_speed === undefined) {
    return undefined;
  }

  const unit = getWeatherUnit(hass, stateObj, "wind_speed");
  return normalizeWindSpeed(forecast.wind_speed, unit);
};

export const normalizeWindSpeed = (speed: number, unit: string): number => {
  const multipliers: Record<string, number> = {
    "km/h": 1 / 3.6,
    kmh: 1 / 3.6,
    mph: 0.44704,
    kn: 0.514444,
    kt: 0.514444,
    knot: 0.514444,
    knots: 0.514444,
    "m/s": 1,
    ms: 1,
  };

  const multiplier = multipliers[unit] || 1;

  return speed * multiplier;
};

export const getNormalizedWindBearing = (
  forecast: ForecastAttribute
): number | undefined => {
  if (forecast.wind_bearing == null) {
    return undefined;
  }

  if (typeof forecast.wind_bearing === "number") {
    return forecast.wind_bearing;
  }

  if (typeof forecast.wind_bearing === "string") {
    const parsed = parseFloat(forecast.wind_bearing);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }

    const cardinalBearing = forecast.wind_bearing.toUpperCase();

    return CARDINAL_DIRECTIONS_DEGREES_MAP[cardinalBearing];
  }

  return undefined;
};

export const aggregateHourlyForecastData = (
  forecast: ForecastAttribute[],
  groupSize: number
): ForecastAttribute[] => {
  const groupedForecast: ForecastAttribute[] = [];

  let i = 0;

  while (i < forecast.length) {
    const currentHour = new Date(forecast[i]!.datetime).getHours();
    const remainder = currentHour % groupSize;
    const steps = remainder === 0 ? groupSize : groupSize - remainder;

    const group = forecast.slice(i, i + steps);
    i += group.length;

    if (group.length === 0) continue;
    const temperatures = group.map((e) => e.temperature);
    const validHumidity = group
      .map((e) => e.humidity)
      .filter((e): e is number => e !== undefined);
    const validPressure = group
      .map((e) => e.pressure)
      .filter((e): e is number => e !== undefined);
    const validWindSpeed = group
      .map((e) => e.wind_speed)
      .filter((e): e is number => e !== undefined);
    const validBearing = group
      .map((e) => e.wind_bearing)
      .filter((e): e is number => e !== undefined);
    const validPrecipChance = group
      .map((e) => e.precipitation_probability)
      .filter((e): e is number => e !== undefined);

    const lastEntryDate = new Date(group[group.length - 1]!.datetime);
    lastEntryDate.setMinutes(59);
    lastEntryDate.setSeconds(59);

    const aggregatedEntry: ForecastAttribute = {
      datetime: group[0]!.datetime,
      groupEndtime: lastEntryDate.toISOString(),
      condition: getWorstCondition(group),
      temperature: parseFloat(average(temperatures).toFixed(1)),
    };

    if (validHumidity.length > 0) {
      aggregatedEntry.humidity = Math.round(average(validHumidity));
    }

    if (validPrecipChance.length > 0) {
      aggregatedEntry.precipitation_probability = Math.max(
        ...validPrecipChance
      );
    }
    if (group.some((e) => e.precipitation !== undefined)) {
      aggregatedEntry.precipitation = group.reduce(
        (sum, entry) => sum + (entry.precipitation || 0),
        0
      );
    }

    const validLows = group
      .map((e) => e.templow)
      .filter((e): e is number => e !== undefined);
    if (validLows.length > 0) {
      aggregatedEntry.templow = Math.min(...validLows);
    }

    if (validPressure.length > 0) {
      aggregatedEntry.pressure = Math.round(average(validPressure));
    }

    if (validWindSpeed.length > 0) {
      aggregatedEntry.wind_speed = average(validWindSpeed);
    }

    if (validBearing.length > 0) {
      aggregatedEntry.wind_bearing = computeAverageBearing(validBearing);
    }

    groupedForecast.push(aggregatedEntry);
  }

  return groupedForecast;
};

export const formatWeatherEntityAttributeValue = (
  hass: ExtendedHomeAssistant,
  weatherEntity: WeatherEntity,
  config: WeatherForecastCardConfig,
  attribute: CurrentWeatherAttributes
): string | undefined => {
  const value = weatherEntity.attributes[attribute];

  if (value === undefined) {
    return undefined;
  }

  if (attribute === "wind_speed") {
    return getWind(hass, weatherEntity);
  }

  // hass.formatEntityAttributeValue does not support wind_gust_speed yet
  if (attribute === "wind_gust_speed") {
    const unit = getWeatherUnit(hass, weatherEntity, "wind_gust_speed");
    const windGustSpeed = formatNumber(value, hass.locale);

    return `${windGustSpeed} ${unit}`;
  }

  // hass.formatEntityAttributeValue does not support ozone yet
  if (attribute === "ozone") {
    const unit = getWeatherUnit(hass, weatherEntity, "ozone");

    return `${value} ${unit}`;
  }

  // Temperature related attributes need special handling for precision
  if (attribute === "apparent_temperature" || attribute === "dew_point") {
    return formatTemperature(
      hass,
      weatherEntity,
      value,
      config.current?.temperature_precision
    );
  }

  return hass.formatEntityAttributeValue(weatherEntity, attribute);
};

export const formatCustomEntityAttributeValue = (
  hass: ExtendedHomeAssistant,
  weatherEntity: WeatherEntity,
  config: WeatherForecastCardConfig,
  attribute: CurrentWeatherAttributes,
  customEntityId: string
): string | undefined => {
  const customEntity = hass.states[customEntityId];

  if (!customEntity) {
    return undefined;
  }

  const value = customEntity.state;

  if (value === undefined) {
    return undefined;
  }

  // Temperature related attributes need special handling for precision
  if (attribute === "apparent_temperature" || attribute === "dew_point") {
    return formatTemperature(
      hass,
      weatherEntity,
      value,
      config.current?.temperature_precision
    );
  }

  const formattedValue = hass.formatEntityState(customEntity);

  return formattedValue;
};

export const formatTemperature = (
  hass: ExtendedHomeAssistant,
  weatherEntity: WeatherEntity,
  value: number | string,
  precision?: number,
  excludeUnit?: boolean
): string => {
  const options =
    precision != null
      ? {
          maximumFractionDigits: precision,
          minimumFractionDigits: precision,
        }
      : undefined;

  const unit = getWeatherUnit(hass, weatherEntity, "temperature");

  // Convert string values to numbers to ensure formatNumber works correctly
  // with precision options. Sensor states are returned as strings, and
  // Intl.NumberFormat doesn't apply precision options to strings properly.
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  // If the value couldn't be parsed, return the original value with unit
  if (isNaN(numericValue)) {
    return `${value}${excludeUnit ? "" : unit}`;
  }

  const formattedValue = formatNumber(numericValue, hass.locale, options);

  return `${formattedValue}${excludeUnit ? "" : unit}`;
};

const computeAverageBearing = (bearings: number[]): number => {
  if (bearings.length === 0) return 0;

  let sumSin = 0;
  let sumCos = 0;

  bearings.forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
  });

  const avgSin = sumSin / bearings.length;
  const avgCos = sumCos / bearings.length;

  const avgRad = Math.atan2(avgSin, avgCos);
  let avgDeg = (avgRad * 180) / Math.PI;

  // Normalize to 0-360
  if (avgDeg < 0) {
    avgDeg += 360;
  }

  return Math.round(avgDeg);
};

const getWorstCondition = (forecast: ForecastAttribute[]): string => {
  const severityOrder = [
    "exceptional", // Default / Unknown / Most Severe
    "hail",
    "lightning-rainy",
    "lightning",
    "snowy-rainy",
    "pouring",
    "snowy",
    "rainy",
    "windy-variant",
    "windy",
    "fog",
    "cloudy",
    "partlycloudy",
    "clear-night",
    "sunny",
  ];

  forecast.sort((a, b) => {
    let indexA = severityOrder.indexOf(a.condition || "exceptional");
    let indexB = severityOrder.indexOf(b.condition || "exceptional");

    if (indexA === -1) indexA = 0;
    if (indexB === -1) indexB = 0;

    return indexA - indexB;
  });

  return forecast[0]?.condition || "exceptional";
};
