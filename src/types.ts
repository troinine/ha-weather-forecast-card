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

export const MAX_TEMPERATURE_PRECISION = 2;

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

export type ConditionColorValue = string | {
  foreground?: string;
  background?: string;
};

export type ConditionColorMap = Partial<Record<string, ConditionColorValue>>;

export interface WeatherForecastCardForecastConfig {
  extra_attribute?: string;
  mode?: ForecastMode;
  show_sun_times?: boolean;
  hourly_group_size?: number;
  hourly_slots?: number;
  daily_slots?: number;
  scroll_to_selected?: boolean;
  use_color_thresholds?: boolean;
  temperature_precision?: number;
  group_condition_icons?: boolean;
  show_condition_labels?: boolean;
  condition_colors?: boolean;
  condition_color_map?: ConditionColorMap;
}

export interface WeatherForecastCardCurrentConfig {
  show_attributes?:
    | boolean
    | CurrentWeatherAttributes
    | CurrentWeatherAttributes[];
  temperature_precision?: number;
  secondary_info_attribute?: CurrentWeatherAttributes;
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
    attribute: string,
    value?: number | string
  ) => string | undefined;
  formatEntityAttributeName: (
    stateObj: HassEntity,
    attribute: string,
    value?: number | string
  ) => string | undefined;
  themes?: {
    darkMode: boolean;
  };
};

export type SuntimesInfo = {
  sunrise: Date;
  sunset: Date;
  isNightTime: boolean;
};

export type ConditionSpan = {
  condition: string;
  startIndex: number;
  endIndex: number;
  count: number;
};
