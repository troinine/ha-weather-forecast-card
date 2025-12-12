import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { WeatherEntity } from "../../data/weather";
import { WeatherForecastCardConfig } from "../../types";
import { styles } from "./wfc-animation.styles";

@customElement("wfc-animation-provider")
export class WeatherAnimationProvider extends LitElement {
  @property({ attribute: false }) weatherEntity?: WeatherEntity;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  static styles = styles;

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

  private calculateWindDrift(driftScale: number): number {
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

  private renderSnow() {
    // Calculate base wind drift (15px per m/s of wind)
    const baseDrift = this.calculateWindDrift(15);

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
    // Calculate base wind drift (10px per m/s of wind - less than snow since rain falls faster)
    const baseDrift = this.calculateWindDrift(10);

    return Array.from({ length: 20 }).map(() => {
      const height = 20 + Math.random() * 20; // 20-40px
      const duration = 0.7 + Math.random() * 0.5; // 0.7-1.2s (fast)
      const delay = -Math.random() * duration;
      const startLeft = Math.random() * 100;

      // Add slight variation to wind drift
      const driftVariation = -5 + Math.random() * 10;
      const totalDrift = baseDrift + driftVariation;

      const opacity = 0.3 + Math.random() * 0.4;

      return html`
        <div
          class="particle rain"
          style="
            left: ${startLeft}%;
            height: ${height}px;
            opacity: ${opacity};
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            --drift: ${totalDrift}px;
          "
        ></div>
      `;
    });
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
            const angle = Math.random() * 360;
            const height = 100 + Math.random() * 100;
            const width = 5 + Math.random() * 15;

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
}
