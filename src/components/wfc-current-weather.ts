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
  CURRENT_WEATHER_ATTRIBUTES,
  CurrentWeatherAttributes,
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
import "./wfc-current-weather-attributes";

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
    if (!this.hass || !this.weatherEntity) {
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
    const attributes = this.getConfiguredAttributes();

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
          ${tempInfo !== null
            ? html`
                <div class="wfc-current-temperatures">
                  <div
                    class="wfc-current-temperature"
                    .actionHandler=${actionHandler({
                      stopPropagation: true,
                      hasHold: hasAction(
                        this.config.hold_action as ActionConfig
                      ),
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
        ${attributes.length > 0
          ? html`<wfc-current-weather-attributes
              .hass=${this.hass}
              .weatherEntity=${this.weatherEntity}
              .config=${this.config}
              .weatherAttributes=${attributes}
            ></wfc-current-weather-attributes>`
          : nothing}
      </div>
    `;
  }

  private getConfiguredAttributes(): CurrentWeatherAttributes[] {
    const showAttr = this.config.current?.show_attributes;

    if (showAttr === undefined || showAttr === null) {
      return [];
    }

    if (Array.isArray(showAttr)) {
      return showAttr;
    }

    if (typeof showAttr === "boolean") {
      return showAttr ? [...CURRENT_WEATHER_ATTRIBUTES] : [];
    }

    if (typeof showAttr === "string") {
      return [showAttr as CurrentWeatherAttributes];
    }

    return [];
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

    if (this.weatherEntity.attributes.temperature != null) {
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

    if (high != null && low != null) {
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
