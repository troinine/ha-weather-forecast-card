import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ForecastAttribute } from "../data/weather";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../types";
import { logger } from "../logger";
import "./wfc-wind-indicator";

@customElement("wfc-forecast-info")
export class WfcForecastInfo extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) forecast!: ForecastAttribute;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  protected createRenderRoot() {
    return this;
  }

  render() {
    if (!this.forecast) {
      return nothing;
    }

    return html`
      <div class="wfc-forecast-slot-info">
        ${this.getExtraInfo() ?? nothing}
      </div>
    `;
  }

  private getExtraInfo(): TemplateResult | null {
    const attribute = this.config?.forecast?.extra_attribute;
    if (!attribute) {
      return null;
    }

    if (attribute === "precipitation_probability") {
      const probability = Math.round(
        this.forecast.precipitation_probability || 0
      );

      return probability > 0
        ? html`
            <span class="wfc-forecast-precip-probability wfc-secondary">
              ${probability < 10 ? `<10%` : `${probability}%`}
            </span>
          `
        : null;
    } else if (attribute === "wind_bearing" || attribute === "wind_direction") {
      const windSpeed = this.forecast.wind_speed || 0;
      const windBearing = this.forecast.wind_bearing || 0;
      const windUnit =
        this.hass.states[this.config.entity]?.attributes?.wind_speed_unit ||
        this.hass.config?.unit_system?.wind_speed ||
        "m/s";

      return html`<wfc-wind-indicator
        .windBearing="${windBearing}"
        .windSpeed="${windSpeed}"
        .windUnit="${windUnit}"
        .type="${attribute === "wind_direction" ? "direction" : "bearing"}"
      ></wfc-wind-indicator>`;
    } else {
      logger.warn(`Unsupported forecast.extra_attribute: ${attribute}`);
    }

    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-info": WfcForecastInfo;
  }
}
