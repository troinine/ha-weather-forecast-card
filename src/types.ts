import {
  ActionConfig,
  BaseActionConfig,
  HomeAssistant,
} from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";

export type ForecastSubscription = Promise<() => void> | undefined;

export enum ForecastMode {
  Chart = "chart",
  Simple = "simple",
}

export interface ForecastToggleActionConfig extends BaseActionConfig {
  action: "toggle-forecast";
}

export interface WeatherForecastCardConfig {
  type: "custom:weather-forecast-card";
  entity: string;
  name?: string;
  temperature_entity?: string;
  show_current?: boolean;
  default_forecast?: "hourly" | "daily";
  icons_path?: string;
  forecast?: {
    extra_attribute?: string;
    mode?: ForecastMode;
    show_sun_times?: boolean;
    hourly_group_size?: number;
  };
  forecast_action?: {
    tap_action?: ForecastActionConfig;
    hold_action?: ForecastActionConfig;
    double_tap_action?: ForecastActionConfig;
  };
  tap_action?: ActionConfig | undefined;
  hold_action?: ActionConfig | undefined;
  double_tap_action?: ActionConfig | undefined;
}

export type ForecastActionConfig = ForecastToggleActionConfig | ActionConfig;

export type ExtendedHomeAssistant = HomeAssistant & {
  formatEntityState?: (stateObj: HassEntity) => string | undefined;
  formatEntityAttributeValue?: (
    stateObj: HassEntity,
    attribute: string
  ) => unknown;
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
