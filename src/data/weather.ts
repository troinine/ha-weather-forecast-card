import { HomeAssistant } from "custom-card-helpers";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { ExtendedHomeAssistant } from "../types";
import memoizeOne from "memoize-one";

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
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
  humidity?: number;
  condition?: string;
  is_daytime?: boolean;
  pressure?: number;
  wind_speed?: string;
  wind_bearing?: number;
}

interface WeatherEntityAttributes extends HassEntityAttributeBase {
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
}

export interface ForecastEvent {
  type: "hourly" | "daily" | "twice_daily";
  forecast: [ForecastAttribute] | null;
}

export interface WeatherEntity extends HassEntityBase {
  attributes: WeatherEntityAttributes;
}

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
