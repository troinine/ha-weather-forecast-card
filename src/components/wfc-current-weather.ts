import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { actionHandler } from "../hass";
import { getSuntimesInfo } from "../helpers";
import {
  ActionConfig,
  ActionHandlerEvent,
  formatNumber,
  handleAction,
  hasAction,
} from "custom-card-helpers";
import {
  ExtendedHomeAssistant,
  TemperatureHighLow,
  TemperatureInfo,
  WeatherForecastCardConfig,
} from "../types";
import {
  ForecastAttribute,
  getWeatherUnit,
  WeatherEntity,
} from "../data/weather";

import "./wfc-weather-condition-icon-provider";

@customElement("wfc-current-weather")
export class WfcCurrentWeather extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) dailyForecast?: ForecastAttribute[];
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  protected createRenderRoot() {
    return this;
  }

  render(): TemplateResult | typeof nothing {
    if (!this.weatherEntity) {
      return nothing;
    }

    const { state } = this.weatherEntity;
    const tempInfo = this.getTemperature();
    const tempHighLowInfo = this.getTemperatureHighLow();
    const name =
      this.config.name || this.weatherEntity.attributes.friendly_name;
    const suntimesInfo = getSuntimesInfo(this.hass, new Date());
    const isNightTime =
      this.config.forecast?.show_sun_times && suntimesInfo
        ? suntimesInfo.isNightTime
        : false;

    return html`
      <div class="wfc-current-weather">
        <div class="wfc-current-conditions">
          <wfc-weather-condition-icon-provider
            .config=${this.config}
            .state=${state}
            .isNightTime=${isNightTime}
            .classes=${"wfc-current-icon"}
          ></wfc-weather-condition-icon-provider>
          <div class="wfc-name-state">
            <div class="wfc-current-state">
              ${this.hass?.formatEntityState?.(this.weatherEntity)}
            </div>
            ${name
              ? html`<div class="wfc-name wfc-secondary">${name}</div>`
              : nothing}
          </div>
        </div>
        ${tempInfo !== null
          ? html`
              <div class="wfc-current-temperatures">
                <div
                  class="wfc-current-temperature"
                  .actionHandler=${actionHandler({
                    stopPropagation: true,
                    hasHold: hasAction(this.config.hold_action as ActionConfig),
                    hasDoubleClick: hasAction(
                      this.config.double_tap_action as ActionConfig
                    ),
                  })}
                  @action=${this.onAction}
                >
                  ${tempInfo.temperature}${tempInfo.temperatureUnit}
                </div>
                ${tempHighLowInfo
                  ? html`
                      <div
                        class="wfc-current-temperature-high-low wfc-secondary"
                      >
                        ${tempHighLowInfo.temperatureHigh}${tempHighLowInfo.temperatureHighLowUnit}
                        /
                        ${tempHighLowInfo.temperatureLow}${tempHighLowInfo.temperatureHighLowUnit}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private onAction = (event: ActionHandlerEvent): void => {
    const config = this.config.temperature_entity
      ? {
          ...this.config,
          entity: this.config.temperature_entity,
        }
      : this.config;

    handleAction(this, this.hass!, config, event.detail.action);
  };

  private getTemperature(): TemperatureInfo | null {
    if (this.config?.temperature_entity) {
      const tempEntity = this.hass.states[this.config.temperature_entity];
      if (tempEntity) {
        return {
          temperature: formatNumber(tempEntity.state, this.hass.locale),
          temperatureUnit:
            tempEntity.attributes.unit_of_measurement ||
            this.hass.config?.unit_system?.temperature,
        };
      }
    }

    if (this.weatherEntity.attributes.temperature) {
      return {
        temperature: formatNumber(
          this.weatherEntity.attributes.temperature,
          this.hass.locale
        ),
        temperatureUnit: getWeatherUnit(
          this.hass,
          this.weatherEntity,
          "temperature"
        ),
      };
    }

    return null;
  }

  private getTemperatureHighLow(): TemperatureHighLow | null {
    if (!this.dailyForecast || this.dailyForecast.length === 0) {
      return null;
    }

    const high = this.dailyForecast[0]?.temperature;
    const low = this.dailyForecast[0]?.templow;

    if (high && low) {
      return {
        temperatureHigh: formatNumber(high, this.hass.locale),
        temperatureLow: formatNumber(low, this.hass.locale),
        temperatureHighLowUnit: getWeatherUnit(
          this.hass,
          this.weatherEntity,
          "temperature"
        ),
      };
    }

    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-current-weather": WfcCurrentWeather;
  }
}
