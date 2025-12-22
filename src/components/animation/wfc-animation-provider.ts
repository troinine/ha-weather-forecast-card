import { LitElement, PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  ExtendedHomeAssistant,
  WeatherEffect,
  WeatherForecastCardConfig,
} from "../../types";
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
    const active = this.getActiveEffects();
    if (!active.length) return nothing;

    return html`
      ${active.map((effect) => {
        switch (effect) {
          case "sky":
            return this.renderSky();
          case "moon":
            return this.renderMoon();
          case "sun":
            return this.renderSun();
          case "rain":
            return this.renderRain();
          case "snow":
            return this.renderSnow();
          case "lightning":
            return this.renderLightning();
          default:
            return nothing;
        }
      })}
    `;
  }

  private getActiveEffects(): WeatherEffect[] {
    const state = this.weatherEntity?.state;
    const effectConfig = this.config.show_condition_effects;

    if (!effectConfig || !state) return [];

    const effects = new Set<WeatherEffect>();

    const isEnabled = (effect: WeatherEffect): boolean => {
      if (effectConfig === true) return true;
      if (Array.isArray(effectConfig)) return effectConfig.includes(effect);
      return false;
    };

    if (state.includes("rainy") || state === "pouring") {
      if (isEnabled("rain")) effects.add("rain");
    }
    if (state.includes("snowy")) {
      if (isEnabled("snow")) effects.add("snow");
    }
    if (state.includes("lightning")) {
      if (isEnabled("lightning")) effects.add("lightning");
    }

    const isClearState = state === "sunny" || state === "clear-night";

    if (isClearState) {
      if (isEnabled("sky")) effects.add("sky");

      // Determine "Night" status based on config and state
      let isNight = state === "clear-night";

      // Only check suntimes if the user explicitly enabled the feature
      if (this.config.forecast?.show_sun_times) {
        const suntimes = getSuntimesInfo(this.hass, new Date());
        if (suntimes?.isNightTime) {
          isNight = true;
        }
      }

      if (isNight) {
        if (isEnabled("moon")) effects.add("moon");
      } else {
        if (isEnabled("sun")) effects.add("sun");
      }
    }

    return Array.from(effects);
  }

  private renderSky() {
    let isNight = this.weatherEntity.state === "clear-night";

    if (this.config.forecast?.show_sun_times) {
      isNight = getSuntimesInfo(this.hass, new Date())?.isNightTime ?? isNight;
    }

    return html`<div class="${isNight ? "night-sky" : "sky"}"></div>`;
  }

  private renderSun() {
    return html`
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

  /**
   * Renders snowflake elements with realistic physics and depth perception.
   *
   * Depth System:
   *   - depth value (0-1) controls visual appearance and behavior
   *   - Far flakes (depth ~0): small (4px), slow, transparent, blurry
   *   - Close flakes (depth ~1): large (12px), fast, opaque, sharp
   *
   * Snowflakes follow a sinusoidal horizontal oscillation pattern while falling with the following parameters:
   *   - drift-amplitude: horizontal oscillation range (10-35px, depth-based for parallax)
   *   - drift-frequency: number of wave cycles during fall (2-4, randomized per flake)
   *
   * The CSS animation uses these parameters to create smooth wave motion
   * with 8 keyframes approximating a sine wave. Wind direction is applied via --fall-angle container rotation,
   * preserving the smooth drift pattern while angling the entire fall trajectory.
   */
  private renderSnow() {
    const intensity = this.computeIntensity();

    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty("--fall-angle", `${this.computeFallingAngle()}deg`);

    const flakes = [];
    let currentX = -15;
    const safeIntensity = Math.max(1, intensity);

    while (currentX < 100) {
      const baseSpacing = random(2, 40);
      const actualSpacing = baseSpacing / safeIntensity;
      currentX += Math.round(actualSpacing);

      const depth = Math.random();
      const flakeSize = depth * 5 + 2;
      const duration = 4.5 / (depth + 0.5) + random(0, 0.8);
      const timingOffset = random(0, 5, true).toFixed(1);
      const opacity = depth * 0.7 + 0.5;
      const blur = depth < 0.3 ? 1.5 - depth * 3 : depth > 0.9 ? 0.5 : 0;
      const shadowSpread = flakeSize * 0.9;

      const driftAmplitude = (10 + depth * 25).toFixed(1);
      const driftFrequency = (2 + Math.random() * 2).toFixed(2);

      const driftStyles = {
        "--drift-amplitude": `${driftAmplitude}px`,
        "--drift-frequency": driftFrequency,
      };

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

  private renderMoon() {
    const starCount = 30;
    const columns = 6;
    const rows = 5;

    return html`
      <div class="moon"></div>
      ${Array.from({ length: starCount }).map((_, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);

        const cellWidth = 100 / columns;
        const cellHeight = 30 / rows; // Restricted to top 30% of card

        const x = random(
          col * cellWidth + cellWidth * 0.15,
          (col + 1) * cellWidth - cellWidth * 0.15,
          true
        );

        const y = random(
          row * cellHeight + cellHeight * 0.15,
          (row + 1) * cellHeight - cellHeight * 0.15,
          true
        );

        const size = random(1, 3, true);
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
