import { html, LitElement, nothing, TemplateResult } from "lit";
import { ForecastAttribute, hasPrecipitation } from "../data/weather";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../types";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("wfc-forecast-details")
export class WfcForecastDetails extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) forecast!: ForecastAttribute;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;
  @property({ attribute: false }) maxPrecipitation?: number;

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.forecast) {
      return nothing;
    }

    const precipitation = this.forecast.precipitation || 0;
    const barHeightPct = this.computePrecipitationBarHeight(precipitation);
    const precipitationAvailable = hasPrecipitation(this.forecast);

    return html`
      <div class="wfc-forecast-slot-temperature">
        <span class="wfc-forecast-temperature-high wfc-small">
          ${Math.round(this.forecast.temperature)}°</span
        >${this.forecast.templow !== undefined
          ? html`<span
              class="wfc-forecast-temperature-low wfc-secondary wfc-small"
              >/${Math.round(this.forecast.templow)}°</span
            >`
          : nothing}
      </div>
      <div
        class=${classMap({
          "wfc-forecast-precip-amount-container": true,
          "wfc-not-available": !precipitationAvailable,
        })}
      >
        <div
          class="wfc-forecast-precip-amount-bar"
          style="--forecast-precipitation-bar-height-pct: ${barHeightPct}%;"
        ></div>
        <span class="wfc-forecast-precip-amount">
          ${precipitation.toFixed(1)}
        </span>
      </div>
    `;
  }

  /**
   * Computes the height of the precipitation bar based on the precipitation amount.
   *
   * Larger amounts result in taller bars, capped at the maximum height defined. Minimal
   * precipitation values result in very small or zero-height bars.
   *
   * @param precipitation The precipitation amount.
   * @returns The height of the precipitation bar in percent.
   */
  private computePrecipitationBarHeight(precipitation: number): number {
    if (precipitation < 0.1) {
      return 0;
    } else if (precipitation < 0.2) {
      return 10;
    }

    const maxPrecip = this.maxPrecipitation || 10;

    // Calculate bar height as a percentage (0-100), rounded to integer
    const percent = (precipitation / maxPrecip) * 100;
    return Math.round(Math.min(percent, 100));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-details": WfcForecastDetails;
  }
}
