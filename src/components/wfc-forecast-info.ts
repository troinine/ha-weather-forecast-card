import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ForecastAttribute, WeatherEntity } from "../data/weather";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../types";
import { logger } from "../logger";
import "./wfc-wind-indicator";

@customElement("wfc-forecast-info")
export class WfcForecastInfo extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
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
      return html`<wfc-wind-indicator
        .hass=${this.hass}
        .weatherEntity=${this.weatherEntity}
        .forecast=${this.forecast}
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
