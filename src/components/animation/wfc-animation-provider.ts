import { LitElement, PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../../types";
import { styles } from "./wfc-animation.styles";
import { styleMap } from "lit/directives/style-map.js";
import { random } from "lodash-es";
import { getSuntimesInfo } from "../../helpers";
import {
  ForecastAttribute,
  getMaxPrecipitationForUnit,
  getNormalizedWindSpeed,
  getWeatherUnit,
  WeatherEntity,
} from "../../data/weather";

const RAIN_INTENSITY_MAX = 10;
const RAIN_INTENSITY_MEDIUM = 3;
const WIND_SPEED_MS_MAX = 14;

@customElement("wfc-animation-provider")
export class WeatherAnimationProvider extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) currentForecast?: ForecastAttribute;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  @state() _isDark: boolean = false;
  @state() _containerHeight: number = 0;

  private _resizeObserver?: ResizeObserver;

  static styles = styles;

  public connectedCallback(): void {
    super.connectedCallback();

    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const height = Math.round(entry?.contentRect.height || 0);
      this._containerHeight = height;
    });

    this._resizeObserver.observe(this);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("hass")) return;

    const oldHass = changedProps.get("hass") as
      | ExtendedHomeAssistant
      | undefined;

    const prevDark = oldHass?.themes?.darkMode;
    const currentDark = this.hass?.themes?.darkMode;

    if (prevDark === currentDark) return;

    this._isDark = currentDark;
    this.onThemeChanged();
  }

  protected render() {
    if (!this.weatherEntity) return nothing;

    const parts = [];

    if (this.isClear()) {
      parts.push(this.renderClear());
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

  private renderClear() {
    const state = this.weatherEntity?.state;

    if (state === "clear-night") {
      return this.renderMoon();
    } else {
      if (this.config.forecast?.show_sun_times) {
        const now = new Date();
        const suntimes = getSuntimesInfo(this.hass, now);

        if (suntimes?.isNightTime) {
          return this.renderMoon();
        }
      }

      return this.renderSunny();
    }
  }

  private renderSnow() {
    const intensity = this.computeIntensity();

    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty("--fall-angle", `${this.computeFallingAngle()}deg`);

    const flakes = [];
    let currentX = -15; // Slightly wider start for wind coverage
    const safeIntensity = Math.max(1, intensity);

    while (currentX < 100) {
      const baseSpacing = random(2, 40);
      const actualSpacing = baseSpacing / safeIntensity;
      currentX += Math.round(actualSpacing);

      // 0 = Far away (small, slow, blurry), 1 = Close (large, fast, sharp)
      const depth = Math.random();
      // Flakes get larger the closer they are. 4px when far, 12px when close
      const flakeSize = depth * 8 + 4;
      // Closer objects fall faster and drift more dramatically
      const duration = 4.5 / (depth + 0.5) + random(0, 0.8);
      const timingOffset = random(0, 5, true).toFixed(1);
      // Distant flakes are more transparent and blurry
      const opacity = depth * 0.7 + 0.5;
      const blur = depth < 0.3 ? 1.5 - depth * 3 : depth > 0.9 ? 0.5 : 0;
      // Closer flakes have a wider light scatter
      const shadowSpread = flakeSize * 0.9;

      const driftStyles = Array.from({ length: 4 }).reduce<
        Record<string, string>
      >((acc, _, i) => {
        // Parallax drift: Background flakes move less than foreground flakes
        const driftRange = 20 + depth * 40;
        acc[`--drift-${i + 1}`] =
          `${random(-driftRange, driftRange).toFixed(0)}px`;
        return acc;
      }, {});

      flakes.push(html`
        <div
          class="snowflake-path"
          style="${styleMap({
            "--duration": `${duration.toFixed(1)}s`,
            "--delay": `${timingOffset}s`,
            "--pos-x": `${currentX}%`,
            "--flake-size": `${flakeSize.toFixed(1)}px`,
            "--flake-opacity": `${opacity.toFixed(2)}`,
            "--flake-blur": `${blur.toFixed(1)}px`,
            "--flake-shadow-spread": `${shadowSpread.toFixed(1)}px`,
            ...driftStyles,
          })}"
        >
          <div class="snowflake"></div>
        </div>
      `);
    }

    return flakes;
  }

  private renderRain() {
    const intensity = this.computeIntensity();

    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty(
      "--fall-angle",
      `${this.computeFallingAngle(true)}deg`
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

      drops.push(html`
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
      `);
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

  private renderMoon() {
    return html`
      <div class="night-sky"></div>
      <div class="moon"></div>
      ${Array.from({ length: 30 }).map(() => {
        const x = random(2, 98);
        const y = random(2, 28);
        const size = random(1, 3);
        const opacity = random(0.3, 1, true);
        const twinkleDelay = random(0, 5, true);

        return html`<div
          class="star"
          style="${styleMap({
            left: `${x}%`,
            top: `${y}%`,
            width: `${size}px`,
            height: `${size}px`,
            opacity: `${opacity}`,
            animationDelay: `${twinkleDelay}s`,
          })}"
        ></div>`;
      })}
    `;
  }

  private isEffectEnabledForState(state?: string): boolean {
    if (!this.config.show_condition_effects) {
      return false;
    }

    if (typeof this.config.show_condition_effects === "boolean") {
      return this.config.show_condition_effects;
    }

    if (Array.isArray(this.config.show_condition_effects) && state) {
      return this.config.show_condition_effects.includes(state);
    }

    return false;
  }

  private isSnowy(): boolean {
    const state = this.weatherEntity?.state || "";
    return state?.includes("snowy") && this.isEffectEnabledForState("snow");
  }

  private isRainy(): boolean {
    const state = this.weatherEntity?.state || "";
    return (
      state.includes("rainy") ||
      (state === "pouring" && this.isEffectEnabledForState("rain"))
    );
  }

  private isLightning(): boolean {
    const state = this.weatherEntity?.state || "";
    return (
      state?.includes("lightning") && this.isEffectEnabledForState("lightning")
    );
  }

  private isClear(): boolean {
    const state = this.weatherEntity?.state;
    return (
      (state === "sunny" && this.isEffectEnabledForState("sunny")) ||
      (state === "clear-night" && this.isEffectEnabledForState("clear-night"))
    );
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

  private computeFallingAngle(isRain: boolean = false): number {
    const forecast = this.currentForecast;
    if (!forecast?.wind_bearing || !forecast?.wind_speed) return 0;

    const speedMS =
      getNormalizedWindSpeed(this.hass, this.weatherEntity, forecast) || 0;
    const MAX_TILT = isRain ? 15 : 35;
    const speedFactor =
      Math.min(speedMS, WIND_SPEED_MS_MAX) / WIND_SPEED_MS_MAX;

    const radians = (forecast.wind_bearing * Math.PI) / 180;
    const directionFactor = Math.sin(radians);
    const curve = isRain ? 0.8 : 0.5;
    const adjustedSpeed = Math.pow(speedFactor, curve);

    return directionFactor * adjustedSpeed * MAX_TILT;
  }

  private onThemeChanged() {
    this.classList.toggle("dark", this._isDark);
    this.classList.toggle("light", !this._isDark);
  }
}
