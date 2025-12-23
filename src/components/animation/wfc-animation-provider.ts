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

const PRECIPITATION_INTENSITY_MAX = 10;
const PRECIPITATION_INTENSITY_MEDIUM = 3;
const WIND_SPEED_MS_MAX = 14;
const SNOW_MAX_PARTICLES = 75;
const RAIN_MAX_PARTICLES = 75;

type BaseParticle = {
  x: string;
  delay: string;
  duration?: string;
};

type Snowflake = BaseParticle & {
  type: "snow";
  size: string;
  opacity: string;
  blur: string;
  shadowSpread: string;
  driftAmplitude: string;
  driftFrequency: string;
};

type Raindrop = BaseParticle & {
  type: "rain";
  landingPosY: string;
};

type Star = BaseParticle & {
  type: "star";
  y: string;
  size: string;
  opacity: string;
};

type SunRay = {
  type: "sunray";
  angle: string;
  height: string;
  width: string;
};

type WeatherParticle = Snowflake | Raindrop | Star | SunRay;

@customElement("wfc-animation-provider")
export class WeatherAnimationProvider extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) currentForecast?: ForecastAttribute;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  @state() _isDark: boolean = false;
  @state() _containerHeight: number = 0;

  private _particles: WeatherParticle[] = [];
  private _resizeObserver?: ResizeObserver;

  static styles = styles;

  public connectedCallback(): void {
    super.connectedCallback();

    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const height = Math.round(entry?.contentRect.height || 0);

      if (this._containerHeight !== height) {
        this._containerHeight = height;
        this._particles = this.computeParticles();
      }
    });

    this._resizeObserver.observe(this);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as
        | ExtendedHomeAssistant
        | undefined;
      const currentDark = this.hass?.themes?.darkMode;

      if (oldHass?.themes?.darkMode !== currentDark) {
        this._isDark = currentDark ?? false;
      }
    }

    if (
      changedProps.has("config") ||
      changedProps.has("weatherEntity") ||
      changedProps.has("currentForecast")
    ) {
      this._particles = this.computeParticles();
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("hass")) {
      this.onThemeChanged();
    }
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

  private computeParticles(): WeatherParticle[] {
    const particles: WeatherParticle[] = [];
    const active = this.getActiveEffects();

    active.forEach((effect) => {
      switch (effect) {
        case "rain":
          particles.push(...this.computeRainParticles());
          break;
        case "snow":
          particles.push(...this.computeSnowParticles());
          break;
        case "moon":
          particles.push(...this.computeStarParticles());
          break;
        case "sun":
          particles.push(...this.computeSunRayParticles());
          break;
        default:
          break;
      }
    });

    return particles;
  }

  /**
   * Computes snowflake elements with realistic physics, depth perception, and optimized distribution.
   *
   * Performance & Distribution Strategy:
   *   - Capping: Particle count is scaled by intensity and capped at SNOW_MAX_PARTICLES to ensure
   *     stable frame rates across all device tiers.
   *   - Columnar Spread: The horizontal span (-15% to 100%) is divided into discrete columns based on
   *     the calculated count, ensuring even coverage without the random "clumping" of traditional loops.
   *   - Positioning: Each flake is placed within its assigned column with randomized jitter to
   *     maintain a natural, non-grid appearance.
   *
   * Depth System:
   *   - depth value (0-1) controls visual appearance and behavior.
   *   - Far flakes (depth ~0): small (~2px), slow, transparent, blurry.
   *   - Close flakes (depth ~1): larger (~7px), fast, opaque, sharp.
   *
   * Oscillation & Wind:
   *   - drift-amplitude: horizontal oscillation range (10-35px, depth-based for parallax).
   *   - drift-frequency: number of wave cycles during fall (2-4, randomized per flake).
   *   - Wind integration: CSS uses these parameters for sinusoidal motion while the container
   *     handles --fall-angle rotation to preserve the drift pattern during wind events.
   *
   * @returns {Snowflake[]} Array of stable particle data for rendering.
   */
  private computeSnowParticles(): Snowflake[] {
    const intensity = this.computeIntensity();
    const flakes: Snowflake[] = [];

    // Calculate count based on intensity, capped for performance
    const count = Math.round(
      (intensity / PRECIPITATION_INTENSITY_MAX) * SNOW_MAX_PARTICLES
    );
    const safeCount = Math.max(5, count);
    const columnWidth = 115 / safeCount;

    for (let i = 0; i < safeCount; i++) {
      const currentX = -15 + i * columnWidth + random(0, columnWidth * 0.5);

      const depth = Math.random();
      const flakeSize = depth * 5 + 2;
      const duration = 4.5 / (depth + 0.5) + random(0, 0.8);
      const timingOffset = random(0, 5, true).toFixed(1);
      const opacity = depth * 0.7 + 0.5;
      const blur = depth < 0.3 ? 1.5 - depth * 3 : depth > 0.9 ? 0.5 : 0;
      const shadowSpread = flakeSize * 0.9;

      const driftAmplitude = (10 + depth * 25).toFixed(0);
      const driftFrequency = (2 + Math.random() * 2).toFixed(2);

      flakes.push({
        type: "snow",
        x: `${currentX.toFixed(1)}%`,
        delay: timingOffset,
        duration: duration.toFixed(1),
        size: flakeSize.toFixed(0),
        opacity: opacity.toFixed(1),
        blur: blur.toFixed(1),
        shadowSpread: shadowSpread.toFixed(1),
        driftAmplitude,
        driftFrequency,
      });
    }

    return flakes;
  }

  /**
   * Computes a stable set of raindrop particles using a capped, column-based distribution.
   *
   * Performance & Distribution Strategy:
   *   - Capping: The total number of particles is limited by RAIN_MAX_PARTICLES to ensure smooth
   *     rendering and animation performance on low-end devices.
   *   - Grid Distribution: Instead of purely random placement which can cause "clumping,"
   *     the width (100%) is divided into equal columns based on the calculated count.
   *   - Jitter: Each drop is placed within its assigned column with a randomized offset
   *     (80% of column width) to maintain a natural, organic appearance.
   *
   * Depth & Physics:
   *   - Timing: Randomized delays and durations prevent synchronized "sheet" falling.
   *   - Splash logic: Calculates landingPosY based on container height with a 15%
   *     variance to simulate depth/perspective of raindrops hitting the ground.
   *
   * @returns {Raindrop[]} Array of stable particle data for rendering.
   */
  private computeRainParticles(): Raindrop[] {
    const intensity = this.computeIntensity();
    const drops: Raindrop[] = [];

    const count = Math.round(
      (intensity / PRECIPITATION_INTENSITY_MAX) * RAIN_MAX_PARTICLES
    );
    const safeCount = Math.max(10, count);
    const columnWidth = 100 / safeCount;

    for (let i = 0; i < safeCount; i++) {
      const currentX = i * columnWidth + random(0, columnWidth * 0.8);

      const timingOffset = random(0.2, 0.5, true);
      const duration = random(0.4, 0.7, true);
      const depthVariance = random(0.85, 1, true);
      const landingPos = this._containerHeight * depthVariance;

      drops.push({
        type: "rain",
        x: `${currentX.toFixed(1)}%`,
        delay: timingOffset.toFixed(2),
        duration: duration.toFixed(2),
        landingPosY: landingPos.toFixed(0),
      });
    }

    return drops;
  }

  private computeStarParticles(): Star[] {
    const stars: Star[] = [];
    const starCount = 30;
    const columns = 6;
    const rows = 5;

    for (let i = 0; i < starCount; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);

      const cellWidth = 100 / columns;
      const cellHeight = 30 / rows;

      const x = random(
        col * cellWidth + cellWidth * 0.15,
        (col + 1) * cellWidth - cellWidth * 0.15
      );

      const y = random(
        row * cellHeight + cellHeight * 0.15,
        (row + 1) * cellHeight - cellHeight * 0.15
      );

      const size = random(1, 3);
      const opacity = random(0.3, 1, true);
      const twinkleDelay = random(0, 5, true);

      stars.push({
        type: "star",
        x: `${x.toFixed(0)}`,
        y: `${y.toFixed(0)}`,
        size: `${size}`,
        opacity: opacity.toFixed(2),
        delay: twinkleDelay.toFixed(1),
      });
    }

    return stars;
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

      let isNight = state === "clear-night";

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
    const rays = this._particles.filter(
      (p): p is SunRay => p.type === "sunray"
    );

    return html`
      <div class="sun">
        <div class="ray-box">
          ${rays.map(
            (ray) =>
              html`<div
                class="sun-ray"
                style="${styleMap({
                  transform: `translate(-50%, 0) rotate(${ray.angle}deg)`,
                  height: `${ray.height}px`,
                  width: `${ray.width}px`,
                })}"
              ></div>`
          )}
        </div>
      </div>
    `;
  }

  private computeSunRayParticles(): SunRay[] {
    return Array.from({ length: 30 }).map(() => ({
      type: "sunray" as const,
      angle: `${random(0, 360)}`,
      height: `${random(100, 200)}`,
      width: `${random(5, 15)}`,
    }));
  }

  private renderSnow() {
    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty("--fall-angle", `${this.computeFallingAngle()}deg`);

    return (
      this._particles.filter((p) => p.type === "snow") as Snowflake[]
    ).map(
      (p) => html`
        <div
          class="snowflake-path"
          style="${styleMap({
            "--duration": `${p.duration}s`,
            "--delay": `${p.delay}s`,
            "--pos-x": p.x,
            "--flake-size": `${p.size}px`,
            "--flake-opacity": p.opacity,
            "--flake-blur": `${p.blur}px`,
            "--flake-shadow-spread": `${p.shadowSpread}px`,
            "--drift-amplitude": `${p.driftAmplitude}px`,
            "--drift-frequency": p.driftFrequency,
          })}"
        >
          <div class="snowflake"></div>
        </div>
      `
    );
  }

  private renderRain() {
    this.style.setProperty("--container-height", `${this._containerHeight}px`);
    this.style.setProperty(
      "--fall-angle",
      `${this.computeFallingAngle(true)}deg`
    );

    return (this._particles.filter((p) => p.type === "rain") as Raindrop[]).map(
      (p) => html`
        <div
          class="raindrop-path"
          style="${styleMap({
            "--duration": `${p.duration}s`,
            "--delay": `${p.delay}s`,
            "--pos-x": p.x,
            "--landing-pos-y": `${p.landingPosY}px`,
          })}"
        >
          <div class="raindrop"></div>
          <div class="splat"></div>
        </div>
      `
    );
  }

  private renderLightning() {
    return html` <div class="lightning-flash"></div> `;
  }

  private renderMoon() {
    return html`
      <div class="moon"></div>
      ${(this._particles.filter((p) => p.type === "star") as Star[]).map(
        (p) => html`
          <div
            class="star"
            style="${styleMap({
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
            })}"
          ></div>
        `
      )}
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
        const intensity = (precip / maxPrecip) * PRECIPITATION_INTENSITY_MAX;
        return Math.min(PRECIPITATION_INTENSITY_MAX, Math.ceil(intensity));
      }
    }

    return this.weatherEntity?.state === "pouring"
      ? PRECIPITATION_INTENSITY_MAX
      : PRECIPITATION_INTENSITY_MEDIUM;
  }

  private computeFallingAngle(isRain: boolean = false): number {
    const forecast = this.currentForecast;
    if (
      forecast?.wind_bearing === undefined ||
      forecast?.wind_speed === undefined
    ) {
      return 0;
    }

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
