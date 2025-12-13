import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../../types";
import { styles } from "./wfc-animation.styles";
import { random } from "lodash-es";
import {
  ForecastAttribute,
  getMaxPrecipitationForUnit,
  getWeatherUnit,
  WeatherEntity,
} from "../../data/weather";

const RAIN_INTENSITY_MAX = 10;
const RAIN_INTENSITY_MEDIUM = 3;
const RAIN_INTENSITY_LOW = 1;

@customElement("wfc-animation-provider")
export class WeatherAnimationProvider extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) currentForecast?: ForecastAttribute;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  @state() _containerHeight: number = 0;

  private _resizeObserver?: ResizeObserver;

  static styles = styles;

  public disconnectedCallback() {
    this._resizeObserver?.disconnect();
    super.disconnectedCallback();
  }

  public firstUpdated() {
    requestAnimationFrame(() => {
      this.style.setProperty("--container-height", `${this.clientHeight}px`);
    });

    this._resizeObserver = new ResizeObserver((entries) => {
      console.log(
        "ResizeObserver triggered for wfc-animation-provider. Entries:",
        entries
      );
      const entry = entries[0];
      const height = Math.round(entry?.contentRect.height || 0);
      this._containerHeight = height;
    });

    this._resizeObserver.observe(this);
  }

  protected render() {
    if (!this.weatherEntity) return nothing;

    const parts = [];

    if (this.isSunny()) {
      parts.push(this.renderSunny());
    }

    if (this.isRainy()) {
      parts.push(this.renderRain());
    }

    if (this.isLightning()) {
      parts.push(this.renderLightning());
    }

    if (this.isSnowy()) {
      parts.push(this.renderSnow());
    }

    return html`${parts}`;
  }

  private renderSnow() {
    // Calculate base wind drift (15px per m/s of wind)
    const baseDrift = this.computeWindDrift(15);

    return Array.from({ length: 20 }).map(() => {
      const size = 3 + Math.random() * 5; // 3-8px
      const duration = 12 + Math.random() * 8; // 12-20s
      const delay = -Math.random() * duration;
      const startLeft = Math.random() * 100;

      // Add some randomness to the wind drift for natural variation
      const driftVariation = -10 + Math.random() * 20;
      const totalDrift = baseDrift + driftVariation;

      const opacity = 0.3 + Math.random() * 0.5;

      return html`
        <div
          class="particle snow"
          style="
            left: ${startLeft}%;
            width: ${size}px;
            height: ${size}px;
            opacity: ${opacity};
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            --drift: ${totalDrift}px;
          "
        ></div>
      `;
    });
  }

  private renderRain() {
    const intensity = this.computeRainIntensity();

    this.style.setProperty("--container-height", `${this._containerHeight}px`);

    const drops = [];
    let currentX = 0;

    const safeIntensity = Math.max(1, intensity);

    while (currentX < 100) {
      const baseSpacing = random(2, 50);
      const actualSpacing = baseSpacing / safeIntensity;

      currentX += actualSpacing;

      const timingOffset = random(0.2, 0.5, true);
      const duration = random(0.4, 0.7, true);
      const depthVariance = random(0.85, 1, true);
      const landingPos = this._containerHeight * depthVariance;

      const style = `
        --duration: ${duration}s;
        --delay: ${timingOffset}s;
        --pos-x: ${currentX}%;
        --landing-pos-y: ${landingPos}px;
      `;

      drops.push(
        html`
          <div class="raindrop" style="${style}"></div>
          <div class="splat" style="${style}"></div>
        `
      );
    }

    return html`<div class="rain">${drops}</div>`;
  }

  private renderLightning() {
    return html` <div class="lightning-flash"></div> `;
  }

  private renderSunny() {
    return html`
      <div class="sky"></div>
      <div class="sun">
        <div class="ray-box">
          ${Array.from({ length: 30 }).map(() => {
            const angle = random(0, 360);
            const height = random(100, 200);
            const width = random(5, 15);

            return html`<div
              class="sun-ray"
              style="
                transform: translate(-50%, 0) rotate(${angle}deg);
                height: ${height}px;
                width: ${width}px;
              "
            ></div>`;
          })}
        </div>
      </div>
    `;
  }

  private isBackgroundConfiguredForState(state?: string): boolean {
    if (!this.config.animated_background_conditions) {
      return false;
    }

    if (typeof this.config.animated_background_conditions === "boolean") {
      return this.config.animated_background_conditions;
    }

    if (Array.isArray(this.config.animated_background_conditions) && state) {
      return this.config.animated_background_conditions.includes(state);
    }

    return false;
  }

  private isSnowy(): boolean {
    const state = this.weatherEntity?.state || "";
    return (
      state?.includes("snowy") && this.isBackgroundConfiguredForState("snow")
    );
  }

  private isRainy(): boolean {
    const state = this.weatherEntity?.state || "";
    return (
      state.includes("rainy") ||
      (state === "pouring" && this.isBackgroundConfiguredForState("rain"))
    );
  }

  private isLightning(): boolean {
    const state = this.weatherEntity?.state || "";
    return (
      state?.includes("lightning") &&
      this.isBackgroundConfiguredForState("lightning")
    );
  }

  private isSunny(): boolean {
    const state = this.weatherEntity?.state;
    return state === "sunny" && this.isBackgroundConfiguredForState("sunny");
  }

  private computeRainIntensity(): number {
    const precip = this.currentForecast?.precipitation;

    if (precip) {
      const unit = getWeatherUnit(
        this.hass,
        this.weatherEntity,
        "precipitation"
      );

      const maxPrecip = getMaxPrecipitationForUnit(unit, "hourly");

      if (maxPrecip > 0) {
        const intensity = (precip / maxPrecip) * RAIN_INTENSITY_MAX;

        // Math.ceil ensures even light rain registers as at least 1
        // Math.min clamps the value to 10 so we don't exceed the scale
        return Math.min(RAIN_INTENSITY_MAX, Math.ceil(intensity));
      }
    }

    return this.weatherEntity?.state === "pouring"
      ? RAIN_INTENSITY_MAX
      : RAIN_INTENSITY_MEDIUM;
  }
  private computeWindDrift(driftScale: number): number {
    // Calculate wind drift based on wind speed and bearing
    const windSpeed = Number(this.weatherEntity?.attributes.wind_speed) || 0;
    const windBearing = this.weatherEntity?.attributes.wind_bearing;

    if (windSpeed === 0 || windBearing === undefined) {
      return 0;
    }

    // Wind bearing indicates where wind is coming FROM
    // So we need to drift in the opposite direction
    // 0° = North wind (blows south), 90° = East wind (blows west), etc.
    const bearingRad = (Number(windBearing) * Math.PI) / 180;

    // Calculate horizontal (east-west) component
    // Negate to get the direction wind is blowing TO
    const eastComponent = -Math.sin(bearingRad);

    // Scale drift by wind speed and provided scale factor
    return eastComponent * windSpeed * driftScale;
  }
}
