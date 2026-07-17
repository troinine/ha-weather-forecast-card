import {
  ActionConfig,
  ActionHandlerDetail,
  BaseActionConfig,
  HASSDomEvent,
  HomeAssistant,
} from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import { ForecastAttribute } from "./data/weather";

export type ForecastUnsubscribe = () => void | Promise<void>;
export type ForecastSubscription =
  | Promise<ForecastUnsubscribe | undefined>
  | undefined;

export type ForecastTypesOption = "both" | "daily" | "hourly";

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
  "cloud",
] as const;

export type CurrentWeatherAttributes =
  (typeof CURRENT_WEATHER_ATTRIBUTES)[number];

export const CHART_ATTRIBUTES = [
  "temperature_and_precipitation",
  "apparent_temperature",
  "humidity",
  "pressure",
  "uv_index",
] as const;

export type ChartAttributes = (typeof CHART_ATTRIBUTES)[number];

export const DEFAULT_CHART_ATTRIBUTE: ChartAttributes =
  "temperature_and_precipitation";

export interface CurrentWeatherAttributeConfig {
  // Optional: an item may be a known weather attribute (name) and/or a custom
  // entity source (entity). At least one must be present to render. An
  // entity-only item displays that entity's state as an arbitrary attribute.
  name?: CurrentWeatherAttributes | (string & {});
  entity?: string;
  label?: string;
  icon?: string;
}

export const CURRENT_WEATHER_ATTRIBUTES_LAYOUTS = [
  "default",
  "compact",
] as const;

export type CurrentWeatherAttributesLayout =
  (typeof CURRENT_WEATHER_ATTRIBUTES_LAYOUTS)[number];

export type WeatherEffect = (typeof WEATHER_EFFECTS)[number];

export enum ForecastMode {
  Chart = "chart",
  Simple = "simple",
}

export interface ForecastToggleActionConfig extends BaseActionConfig {
  action: "toggle-forecast";
}

export interface ForecastSelectAttributeActionConfig extends BaseActionConfig {
  action: "select-forecast-attribute";
}

export interface WeatherForecastCardForecastConfig {
  extra_attribute?: string;
  mode?: ForecastMode;
  show_sun_times?: boolean;
  show_history?: boolean;
  history_hours?: number;
  hourly_group_size?: number;
  hourly_slots?: number;
  daily_slots?: number;
  scroll_to_selected?: boolean;
  use_color_thresholds?: boolean;
  temperature_precision?: number;
  show_attribute_selector?: boolean;
  default_chart_attribute?: ChartAttributes;
}

export interface WeatherForecastCardCurrentConfig {
  show_attributes?:
    | boolean
    | CurrentWeatherAttributes
    | CurrentWeatherAttributes[]
    | CurrentWeatherAttributeConfig
    | (CurrentWeatherAttributes | CurrentWeatherAttributeConfig)[];
  temperature_precision?: number;
  secondary_info_attribute?: CurrentWeatherAttributes | CurrentWeatherAttributeConfig;
  temperature_entity?: string;
  attributes_layout?: CurrentWeatherAttributesLayout;
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
  /** @deprecated Use `current.temperature_entity` instead */
  temperature_entity?: string;
  show_current?: boolean;
  show_forecast?: boolean;
  default_forecast?: "hourly" | "daily";
  forecast_types?: ForecastTypesOption;
  icons_path?: string;
  show_condition_effects?: boolean | WeatherEffect[];
  show_moon_phase?: boolean;
  current?: WeatherForecastCardCurrentConfig;
  forecast?: WeatherForecastCardForecastConfig;
  forecast_action?: WeatherForecastCardForecastActionConfig;
  tap_action?: ActionConfig | undefined;
  hold_action?: ActionConfig | undefined;
  double_tap_action?: ActionConfig | undefined;
}

export type ForecastActionConfig =
  | ForecastToggleActionConfig
  | ForecastSelectAttributeActionConfig
  | ActionConfig;

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
