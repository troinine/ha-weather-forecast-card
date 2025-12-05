import { css, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  ExtendedHomeAssistant,
  SuntimesInfo,
  WeatherForecastCardConfig,
} from "../types";
import { ForecastAttribute, ForecastType } from "../data/weather";
import { formatDay, formatHour, formatTime, getSuntimesInfo } from "../helpers";

@customElement("wfc-forecast-header-items")
export class WfcForecastHeaderItems extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) forecast!: ForecastAttribute;
  @property({ attribute: false }) forecastType!: ForecastType;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  private suntimesInfo?: SuntimesInfo | null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;

  public connectedCallback(): void {
    super.connectedCallback();

    this.suntimesInfo = getSuntimesInfo(this.hass, this.forecast.datetime);
  }

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.forecast) {
      return nothing;
    }

    const { label, className } = this.getDateInfo();
    const isNightTime =
      this.forecastType === "hourly" &&
      this.config.forecast?.show_sun_times &&
      this.suntimesInfo
        ? this.suntimesInfo.isNightTime
        : false;

    return html`
      <div class="wfc-forecast-slot-time wfc-label ${className || ""}">
        ${label}
      </div>
      <wfc-weather-condition-icon-provider
        .hass=${this.hass}
        .config=${this.config}
        .state=${this.forecast.condition}
        .isNightTime=${isNightTime}
      ></wfc-weather-condition-icon-provider>
    `;
  }

  private getDateInfo(): { label: string; className?: string } {
    if (this.forecastType !== "hourly") {
      return {
        label: formatDay(this.hass, this.forecast.datetime),
      };
    }

    const forecastDate = new Date(this.forecast.datetime);

    let displayDate = forecastDate;
    let className: string | undefined;

    if (this.config.forecast?.show_sun_times && this.suntimesInfo) {
      const hour = forecastDate.getHours();

      if (hour === this.suntimesInfo.sunrise.getHours()) {
        className = "wfc-sunrise";
        displayDate = this.suntimesInfo.sunrise;
      } else if (hour === this.suntimesInfo.sunset.getHours()) {
        className = "wfc-sunset";
        displayDate = this.suntimesInfo.sunset;
      }
    }

    const label = className
      ? formatTime(this.hass, displayDate, true)
      : formatHour(this.hass, displayDate, true);

    return { label, className };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-header-items": WfcForecastHeaderItems;
  }
}
