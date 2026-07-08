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
import {
  getMoonPhaseInfo,
  getSuntimesInfo,
  moonLitPath,
  moonShadowPath,
  MoonPhaseInfo,
} from "../../helpers";
import {
  ForecastAttribute,
  getMaxPrecipitationForUnit,
  getNormalizedWindBearing,
  getNormalizedWindSpeed,
  getWeatherUnit,
  WeatherEntity,
} from "../../data/weather";

const PRECIPITATION_INTENSITY_MAX = 10;
const PRECIPITATION_INTENSITY_MEDIUM = 3;
const WIND_SPEED_MS_MAX = 14;
const SNOW_MAX_PARTICLES = 75;
const RAIN_MAX_PARTICLES = 75;
const CLOUD_COUNT_OVERCAST = 4;
const CLOUD_COUNT_PARTLY = 3;
// Depth layers for parallax: clouds are split across these, each drifting at its
// own speed (far = slower, near = faster) for a sense of depth.
const CLOUD_DEPTH_LAYERS = 2;
// Drift-duration multiplier per layer (index 0 = far/slow, last = near/fast).
const CLOUD_LAYER_SPEED = [1.45, 0.7];
// Seconds for a cloud layer to drift one card-width. Calm skies drift slowly,
// windy skies faster.
const CLOUD_DRIFT_DURATION_CALM_S = 90;
const CLOUD_DRIFT_DURATION_WINDY_S = 50;
// Minimum horizontal drift so clouds keep moving gently in calm or N-S winds.
const CLOUD_DRIFT_BASELINE_FACTOR = 0.15;

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

type Cloud = {
  type: "cloud";
  variant: "white" | "grey";
  night: boolean;
  // Depth layer (0 = far) drives size, height, opacity and drift speed (parallax).
  layer: number;
  // Silhouette variant (1-5) and a horizontal flip give each cloud a distinct
  // shape so the deck does not look like one repeated sprite.
  shape: number;
  flip: boolean;
  x: string;
  y: string;
  width: string;
  height: string;
  opacity: string;
};

type WeatherParticle = Snowflake | Raindrop | Star | SunRay | Cloud;

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

  // Clouds are regenerated only when their defining inputs (coverage, day/night)
  // change, not on every hass refresh, so a state update does not make the clouds
  // jump to new random positions.
  private _cloudParticles: Cloud[] = [];
  private _cloudSignature?: string;

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

    // Reflect whether the cloud deck is active so the card can lift the current
    // weather text off the clouds only when they are actually present (not for
    // clear/sunny effects).
    this.toggleAttribute(
      "has-clouds",
      this.getActiveEffects().includes("cloud")
    );
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
          case "cloud":
            return this.renderClouds();
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
        case "cloud":
          particles.push(...this.getStableCloudParticles());
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
    const isCloudy = state === "cloudy";
    const isPartlyCloudy = state === "partlycloudy";

    // Sky backdrop for clear skies, partly cloudy and overcast `cloudy`.
    if (isClearState || isPartlyCloudy || isCloudy) {
      if (isEnabled("sky")) effects.add("sky");
    }

    // Sun or moon for clear skies and partly cloudy. Fully overcast `cloudy`
    // hides the celestial body behind the cloud deck.
    if (isClearState || isPartlyCloudy) {
      if (this.isNightTime()) {
        if (isEnabled("moon")) effects.add("moon");
      } else {
        if (isEnabled("sun")) effects.add("sun");
      }
    }

    // Drifting clouds for cloudy and partly cloudy.
    if (isCloudy || isPartlyCloudy) {
      if (isEnabled("cloud")) effects.add("cloud");
    }

    return Array.from(effects);
  }

  /**
   * Whether the card should render a night-time sky. `clear-night` is inherently
   * night; other states rely on the sun times helper when those are enabled.
   */
  private isNightTime(): boolean {
    if (this.weatherEntity?.state === "clear-night") {
      return true;
    }

    if (this.config.forecast?.show_sun_times) {
      return getSuntimesInfo(this.hass, new Date())?.isNightTime ?? false;
    }

    return false;
  }

  private renderSky() {
    const base = this.isNightTime() ? "night-sky" : "sky";
    const isOvercast = this.weatherEntity?.state === "cloudy";

    return html`<div class="${isOvercast ? `${base} overcast` : base}"></div>`;
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

  /**
   * Returns cloud particles, reusing the previously generated set unless the
   * clouds' defining inputs (coverage and day/night) have changed. This keeps the
   * clouds stable across hass refreshes and container resizes instead of
   * re-randomizing their positions on every update.
   */
  private getStableCloudParticles(): Cloud[] {
    const isOvercast = this.weatherEntity?.state === "cloudy";
    const signature = `${isOvercast ? "overcast" : "partly"}:${this.isNightTime()}`;

    if (signature !== this._cloudSignature || !this._cloudParticles.length) {
      this._cloudParticles = this.computeCloudParticles();
      this._cloudSignature = signature;
    }

    return this._cloudParticles;
  }

  /**
   * Computes drifting cloud sprites. Overcast (`cloudy`) produces a denser deck of
   * larger, lower, grey clouds; partly cloudy produces fewer, smaller, lighter white
   * clouds. Clouds are split across depth layers (far = small/faint/high, near =
   * large/bold/low). Sizes are in pixels and `x` is a percentage of the card width
   * so clouds scale naturally with the card. Drift speed is layer-wide (see
   * renderClouds).
   */
  private computeCloudParticles(): Cloud[] {
    const isOvercast = this.weatherEntity?.state === "cloudy";
    const isNight = this.isNightTime();
    const count = isOvercast ? CLOUD_COUNT_OVERCAST : CLOUD_COUNT_PARTLY;
    const slot = 100 / count;
    const clouds: Cloud[] = [];

    for (let i = 0; i < count; i++) {
      const layer = i % CLOUD_DEPTH_LAYERS;
      const isFar = layer === 0;

      // Spread clouds across the width with jitter so the deck looks organic.
      const x = i * slot + random(0, slot * 0.5) - slot * 0.25;

      // Depth: far clouds are smaller, higher and fainter; near clouds are larger,
      // lower and bolder. Wide ranges plus aspect-ratio jitter keep footprints
      // varied rather than all sharing one shape.
      const width = isOvercast
        ? isFar
          ? random(140, 200)
          : random(215, 285)
        : isFar
          ? random(110, 165)
          : random(180, 240);
      const height = width * random(0.38, 0.5, true);
      // Anchored toward the top so clouds hug the upper edge and leave the lower
      // card area clear for the weather text.
      const y = isOvercast
        ? isFar
          ? random(-26, -12)
          : random(-16, -2)
        : isFar
          ? random(-10, 4)
          : random(-4, 12);

      // Overcast clouds stay translucent so the card surface shows through and
      // text keeps its contrast; partly cloudy clouds are more solid. Far clouds
      // are fainter than near ones, and night dims both into a subtle silhouette.
      let opacity = isOvercast
        ? isFar
          ? random(0.36, 0.5, true)
          : random(0.5, 0.64, true)
        : isFar
          ? random(0.68, 0.8, true)
          : random(0.82, 0.92, true);
      if (isNight) {
        opacity *= 0.7;
      }

      clouds.push({
        type: "cloud",
        variant: isOvercast ? "grey" : "white",
        night: isNight,
        layer,
        shape: random(1, 5),
        flip: random(0, 1) === 1,
        x: x.toFixed(1),
        y: y.toFixed(0),
        width: width.toFixed(0),
        height: height.toFixed(0),
        opacity: opacity.toFixed(2),
      });
    }

    return clouds;
  }

  /**
   * Drift direction and duration for a cloud layer, derived from the wind. Clouds
   * move in the direction the wind blows: `wind_bearing` is the meteorological
   * direction the wind comes *from*, so the rightward (eastward) component is
   * `-sin(bearing)` — a wind from the west (270°) drifts clouds to the right, a
   * wind from the east (90°) to the left. Horizontal speed scales with both wind
   * speed and how east-west the wind blows, with a small baseline so clouds keep
   * drifting gently in calm or purely north-south winds.
   */
  private computeCloudDrift(): { duration: number; driftRight: boolean } {
    const forecast = this.currentForecast;
    const speedMS = forecast
      ? getNormalizedWindSpeed(this.hass, this.weatherEntity, forecast) || 0
      : 0;
    const speedFactor = Math.min(speedMS, WIND_SPEED_MS_MAX) / WIND_SPEED_MS_MAX;

    // Signed horizontal component in [-1, 1]; positive points right (east).
    // getNormalizedWindBearing handles numeric and cardinal (e.g. "NW") bearings.
    const bearing = forecast ? getNormalizedWindBearing(forecast) : undefined;
    const horizontal =
      bearing !== undefined ? -Math.sin((bearing * Math.PI) / 180) : 0;

    const horizontalFactor = Math.max(
      CLOUD_DRIFT_BASELINE_FACTOR,
      speedFactor * Math.abs(horizontal)
    );

    const duration =
      CLOUD_DRIFT_DURATION_CALM_S -
      horizontalFactor *
        (CLOUD_DRIFT_DURATION_CALM_S - CLOUD_DRIFT_DURATION_WINDY_S);

    return {
      duration,
      driftRight: horizontal >= 0,
    };
  }

  private renderCloudFilter() {
    // A single turbulence filter roughens the soft cloud silhouettes into organic,
    // billowy edges. Defined in this shadow root so `filter: url(#wfc-cloud-rough)`
    // resolves locally; if a browser cannot resolve it, the clouds gracefully fall
    // back to the smooth gooey silhouette.
    return html`
      <svg class="cloud-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <filter
            id="wfc-cloud-rough"
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            color-interpolation-filters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="5"
              seed="7"
              stitchTiles="stitch"
              result="noise"
            ></feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="42"
              xChannelSelector="R"
              yChannelSelector="G"
              result="disp"
            ></feDisplacementMap>
            <feGaussianBlur in="disp" stdDeviation="0.6"></feGaussianBlur>
          </filter>
        </defs>
      </svg>
    `;
  }

  private renderClouds() {
    const clouds = this._particles.filter(
      (p): p is Cloud => p.type === "cloud"
    );

    if (!clouds.length) return nothing;

    const { duration, driftRight } = this.computeCloudDrift();

    const renderCloud = (c: Cloud) => {
      const classes = [
        "cloud",
        `cloud-shape-${c.shape}`,
        c.variant === "grey" ? "grey" : "",
        c.night ? "night" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return html`<div
        class="${classes}"
        style="${styleMap({
          left: `${c.x}%`,
          top: `${c.y}px`,
          width: `${c.width}px`,
          height: `${c.height}px`,
          opacity: c.opacity,
          transform: c.flip ? "scaleX(-1)" : "none",
        })}"
      >
        <div class="cloud-puffs"></div>
        <div class="cloud-shade"></div>
      </div>`;
    };

    // One drifting track per depth layer, each at its own parallax speed but the
    // same wind direction. Each track renders its clouds twice inside a
    // double-width track: translating by -50% slides the second copy into the
    // first's start position for a seamless loop without needing the card width.
    return html`
      ${this.renderCloudFilter()}
      ${Array.from({ length: CLOUD_DEPTH_LAYERS }, (_unused, layer) => {
        const layerClouds = clouds.filter((c) => c.layer === layer);
        if (!layerClouds.length) return nothing;

        // Round to a coarse bucket so small wind fluctuations between refreshes do
        // not change the duration and visibly nudge the running drift.
        const layerDuration =
          Math.round((duration * (CLOUD_LAYER_SPEED[layer] ?? 1)) / 5) * 5;

        return html`<div
          class="cloud-track ${driftRight ? "drift-right" : ""}"
          style="${styleMap({ "--cloud-drift-duration": `${layerDuration}s` })}"
        >
          <div class="cloud-set">${layerClouds.map(renderCloud)}</div>
          <div class="cloud-set cloud-set-second">
            ${layerClouds.map(renderCloud)}
          </div>
        </div>`;
      })}
    `;
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
    const phase =
      this.config.show_moon_phase === false
        ? null
        : getMoonPhaseInfo(this.hass, new Date());

    // Stars render before the moon so the moon paints over any star behind it.
    return html`
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
      <div class="moon-body">
        ${this.renderMoonGlow(phase)}
        <div class="moon">${this.renderMoonPhase(phase)}</div>
      </div>
    `;
  }

  /** Glow behind the disc, shaped to the lit region so only the sunlit limb glows. */
  private renderMoonGlow(phase: MoonPhaseInfo | null) {
    const litPath = phase
      ? moonLitPath(phase.fraction, phase.litRight)
      : moonLitPath(1, true);

    // The blur lives on the padded wrapper div, not the svg (see the CSS). The svg
    // keeps the original 0 0 100 100 viewBox and carries explicit width/height so
    // Safari sizes it from the disc, not from an svg's 300x150 intrinsic default.
    return html`
      <div class="moon-glow">
        <svg
          viewBox="0 0 100 100"
          width="100"
          height="100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d=${litPath}></path>
        </svg>
      </div>
    `;
  }

  /**
   * Shades the moon to match the current lunar phase. Returns nothing when the
   * feature is disabled, leaving a fully lit moon.
   */
  private renderMoonPhase(phase: MoonPhaseInfo | null) {
    if (!phase) {
      return nothing;
    }

    return html`
      <svg
        class="moon-phase"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d=${moonShadowPath(phase.fraction, phase.litRight)}></path>
      </svg>
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
