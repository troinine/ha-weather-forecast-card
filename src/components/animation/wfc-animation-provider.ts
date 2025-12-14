import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../../types";
import { styles } from "./wfc-animation.styles";
import { styleMap } from "lit/directives/style-map.js";
import { random } from "lodash-es";
import {
  ForecastAttribute,
  getMaxPrecipitationForUnit,
  getNormalizedWindSpeed,
  getWeatherUnit,
  WeatherEntity,
} from "../../data/weather";

const RAIN_INTENSITY_MAX = 10;
const RAIN_INTENSITY_MEDIUM = 3;
const RAIN_TILT_DEG_MAX = 20;
const SNOW_TILT_DEG_MAX = 40;
const WIND_SPEED_MS_MAX = 14;

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
    const intensity = this.computeIntensity();

    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty(
      "--fall-angle",
      `${this.computeFallingAngle(SNOW_TILT_DEG_MAX)}deg`
    );

    const flakes = [];

    // Starts slightly off-screen and goes slightly off-screen to ensure full coverage
    // even with significant wind drift.
    let currentX = -10;

    const safeIntensity = Math.max(1, intensity);

    while (currentX < 110) {
      const baseSpacing = random(2, 40);
      const actualSpacing = baseSpacing / safeIntensity;

      currentX += actualSpacing;

      const timingOffset = random(1, 5, true);
      const duration = random(2, 4, true);
      const flakeSize = random(4, 8);
      const opacity = random(0.3, 1, true);

      const driftStyles = Array.from({ length: 4 }).reduce<
        Record<string, string>
      >((acc, _, i) => {
        acc[`--drift-${i + 1}`] = `${random(-35, 35)}px`;
        return acc;
      }, {});

      flakes.push(
        html`
          <div
            class="snowflake-path"
            style="${styleMap({
              "--duration": `${duration}s`,
              "--delay": `${timingOffset}s`,
              "--pos-x": `${currentX}%`,
              "--flake-size": `${flakeSize}px`,
              "--flake-opacity": `${opacity}`,
              ...driftStyles,
            })}"
          >
            <div class="snowflake"></div>
          </div>
        `
      );
    }

    return flakes;
  }

  private renderRain() {
    const intensity = this.computeIntensity();

    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty(
      "--fall-angle",
      `${this.computeFallingAngle(RAIN_TILT_DEG_MAX)}deg`
    );

    const drops = [];
    let currentX = 0;

    const safeIntensity = Math.max(1, intensity);

    while (currentX < 100) {
      const baseSpacing = random(2, 35);
      const actualSpacing = baseSpacing / safeIntensity;

      currentX += actualSpacing;

      const timingOffset = random(0.2, 0.5, true);
      const duration = random(0.4, 0.7, true);
      const depthVariance = random(0.85, 1, true);
      const landingPos = this._containerHeight * depthVariance;

      drops.push(
        html`
          <div
            class="raindrop-path"
            style="${styleMap({
              "--duration": `${duration}s`,
              "--delay": `${timingOffset}s`,
              "--pos-x": `${currentX}%`,
              "--landing-pos-y": `${landingPos}px`,
            })}"
          >
            <div class="raindrop"></div>
            <div class="splat"></div>
          </div>
        `
      );
    }

    return drops;
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
              style="${styleMap({
                transform: `translate(-50%, 0) rotate(${angle}deg)`,
                height: `${height}px`,
                width: `${width}px`,
              })}"
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

  private computeIntensity(): number {
    const precip = this.currentForecast?.precipitation || 0;

    if (precip > 0) {
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

  private computeFallingAngle(maxAngle: number): number {
    if (
      !this.currentForecast ||
      !this.currentForecast.wind_bearing ||
      !this.currentForecast.wind_speed
    ) {
      return 0;
    }

    const bearing = this.currentForecast.wind_bearing;
    const speedMS =
      getNormalizedWindSpeed(
        this.hass,
        this.weatherEntity,
        this.currentForecast
      ) || 0;

    const radians = (bearing * Math.PI) / 180;
    const directionFactor = Math.sin(radians);

    const speedFactor =
      Math.min(speedMS, WIND_SPEED_MS_MAX) / WIND_SPEED_MS_MAX;

    return directionFactor * speedFactor * maxAngle;
  }
}
