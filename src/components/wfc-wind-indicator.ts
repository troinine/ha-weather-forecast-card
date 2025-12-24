import { LitElement, html, css, TemplateResult, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ExtendedHomeAssistant } from "../types";
import {
  ForecastAttribute,
  getNormalizedWindSpeed,
  WeatherEntity,
} from "../data/weather";

@customElement("wfc-wind-indicator")
export class WfcWindIndicator extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) forecast!: ForecastAttribute;
  @property({ attribute: false }) size = 35;
  @property({ attribute: false }) radius = 20;
  @property({ attribute: false }) type: "bearing" | "direction" = "bearing";

  static styles = css`
    :host {
      display: inline-block;
    }
    text {
      font-size: calc(var(--ha-font-size-l, 16px) * 1.4);
      fill: var(--primary-text-color);
      font-weight: 600;
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `;

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this.forecast || !this.weatherEntity) {
      return nothing;
    }

    const windSpeed = this.forecast.wind_speed || 0;
    const windBearing = this.forecast.wind_bearing || 0;

    const R = this.radius;
    const strokeWidth = 4;
    const padding = 10;
    const cx = R + padding;
    const cy = R + padding;
    const boxSize = 2 * (R + padding);

    const speed = Math.round(windSpeed);
    const lineColor = this.computeLineColor();

    let bearing = windBearing;
    if (this.type === "direction") {
      bearing = (bearing + 180) % 360;
    }

    const baseY = cy - R;
    const tipY = baseY - 10;
    const spreadX = 7;

    return html`
      <svg
        width="${this.size}"
        height="${this.size}"
        viewBox="0 0 ${boxSize} ${boxSize}"
        role="img"
        aria-label="Wind speed: ${speed}, bearing: ${bearing} degrees"
      >
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${R}"
          stroke="${lineColor}"
          stroke-width="${strokeWidth}"
          fill="none"
        />

        <g transform="rotate(${bearing} ${cx} ${cy})">
          <polygon
            points="
              ${cx - spreadX},${baseY}
              ${cx + spreadX},${baseY}
              ${cx},${tipY}
            "
            fill="${lineColor}"
          />
        </g>

        <text x="${cx}" y="${cy}" dy="2px">${speed}</text>
      </svg>
    `;
  }

  private computeLineColor(): string {
    const speedMS = getNormalizedWindSpeed(
      this.hass,
      this.weatherEntity,
      this.forecast
    );

    if (!speedMS || speedMS <= 3) {
      return "var(--wfc-wind-low)";
    }
    if (speedMS <= 8) {
      return "var(--wfc-wind-medium)";
    }

    return "var(--wfc-wind-high)";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-wind-indicator": WfcWindIndicator;
  }
}
