import { HomeAssistant } from "custom-card-helpers";
import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { WeatherForecastCardConfig } from "../types";
import { formatDay } from "../helpers";
import {
  ForecastAttribute,
  ForecastType,
  getMaxPrecipitationForUnit,
  getWeatherUnit,
  WeatherEntity,
} from "../data/weather";

import "./wfc-forecast-header-items";
import "./wfc-forecast-details";
import "./wfc-forecast-info";

@customElement("wfc-forecast-simple")
export class WfcForecastSimple extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) forecast: ForecastAttribute[] = [];
  @property({ attribute: false }) forecastType!: ForecastType;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  private maxPrecipitation: number = 0;

  public connectedCallback(): void {
    super.connectedCallback();

    this.maxPrecipitation = getMaxPrecipitationForUnit(
      getWeatherUnit(this.hass, this.weatherEntity, "precipitation"),
      this.forecastType
    );
  }

  protected createRenderRoot() {
    return this;
  }

  render(): TemplateResult | typeof nothing {
    if (!this.forecast?.length) {
      return nothing;
    }

    const forecastTemplates: TemplateResult[] = [];

    let currentDay: string | undefined;

    this.forecast.forEach((forecast) => {
      if (!forecast.datetime) {
        return;
      }

      if (this.forecastType === "hourly") {
        const forecastDay = formatDay(this.hass, forecast.datetime);
        if (currentDay !== forecastDay) {
          currentDay = forecastDay;
          forecastTemplates.push(
            html`<div class="wfc-day-indicator-container">
              <div class="wfc-day-indicator">${forecastDay}</div>
            </div>`
          );
        }
      }

      forecastTemplates.push(
        html`
          <div class="wfc-forecast-slot">
            <wfc-forecast-header-items
              .hass=${this.hass}
              .forecast=${forecast}
              .forecastType=${this.forecastType}
              .config=${this.config}
            ></wfc-forecast-header-items>
            <wfc-forecast-details
              .hass=${this.hass}
              .forecast=${forecast}
              .maxPrecipitation=${this.maxPrecipitation}
              .config=${this.config}
            ></wfc-forecast-details>
            <wfc-forecast-info
              .hass=${this.hass}
              .forecast=${forecast}
              .config=${this.config}
            ></wfc-forecast-info>
          </div>
        `
      );
    });

    return html`
      <div class="wfc-forecast wfc-scroll-container">${forecastTemplates}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-simple": WfcForecastSimple;
  }
}
