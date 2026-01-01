import {
  ActionConfig,
  ActionHandlerDetail,
  BaseActionConfig,
  HASSDomEvent,
  HomeAssistant,
} from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { ForecastAttribute } from "./data/weather";

export type ForecastSubscription = Promise<() => void> | undefined;

export type ForecastActionDetails = ActionHandlerDetail & {
  selectedForecast: ForecastAttribute;
};
export type ForecastActionEvent = HASSDomEvent<ForecastActionDetails>;

export type ForecastActionHandler = (event: ForecastActionEvent) => void;

export const CURRENT_WEATHER_ATTRIBUTES = [
  "humidity",
  "pressure",
  "wind_speed",
  "wind_gust_speed",
  "visibility",
  "ozone",
  "uv_index",
  "dew_point",
  "apparent_temperature",
  "cloud_coverage",
] as const;

export const WEATHER_EFFECTS = [
  "rain",
  "snow",
  "lightning",
  "sky",
  "moon",
  "sun",
] as const;

export type CurrentWeatherAttributes =
  (typeof CURRENT_WEATHER_ATTRIBUTES)[number];

export type WeatherEffect = (typeof WEATHER_EFFECTS)[number];

export enum ForecastMode {
  Chart = "chart",
  Simple = "simple",
}

export interface ForecastToggleActionConfig extends BaseActionConfig {
  action: "toggle-forecast";
}

export interface WeatherForecastCardForecastConfig {
  extra_attribute?: string;
  mode?: ForecastMode;
  show_sun_times?: boolean;
  hourly_group_size?: number;
  hourly_slots?: number;
  daily_slots?: number;
  scroll_to_selected?: boolean;
  use_color_thresholds?: boolean;
}

export interface WeatherForecastCardCurrentConfig {
  show_attributes?:
    | boolean
    | CurrentWeatherAttributes
    | CurrentWeatherAttributes[];
}

export interface WeatherForecastCardForecastActionConfig {
  tap_action?: ForecastActionConfig;
  hold_action?: ForecastActionConfig;
  double_tap_action?: ForecastActionConfig;
}

export interface WeatherForecastCardConfig {
  type: "custom:weather-forecast-card";
  entity: string;
  name?: string;
  temperature_entity?: string;
  show_current?: boolean;
  show_forecast?: boolean;
  default_forecast?: "hourly" | "daily";
  icons_path?: string;
  show_condition_effects?: boolean | WeatherEffect[];
  current?: WeatherForecastCardCurrentConfig;
  forecast?: WeatherForecastCardForecastConfig;
  forecast_action?: WeatherForecastCardForecastActionConfig;
  tap_action?: ActionConfig | undefined;
  hold_action?: ActionConfig | undefined;
  double_tap_action?: ActionConfig | undefined;
}

export type ForecastActionConfig = ForecastToggleActionConfig | ActionConfig;

export type ExtendedHomeAssistant = HomeAssistant & {
  formatEntityState: (stateObj: HassEntity) => string | undefined;
  formatEntityAttributeValue: (
    stateObj: HassEntity,
    attribute: string
  ) => string | undefined;
  formatEntityAttributeName: (
    stateObj: HassEntity,
    attribute: string
  ) => string | undefined;
  themes?: {
    darkMode: boolean;
  };
};

export type TemperatureHighLow = {
  temperatureHigh: string;
  temperatureLow: string;
  temperatureHighLowUnit: string;
};

export type TemperatureInfo = {
  temperature: string;
  temperatureUnit: string;
};

export type SuntimesInfo = {
  sunrise: Date;
  sunset: Date;
  isNightTime: boolean;
};
