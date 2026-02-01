import {
  css,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  ExtendedHomeAssistant,
  SuntimesInfo,
  WeatherForecastCardConfig,
} from "../types";
import { ForecastAttribute, ForecastType } from "../data/weather";
import {
  endOfHour,
  formatDay,
  formatDayOfMonth,
  formatHourParts,
  formatTimeParts,
  getSuntimesInfo,
  useAmPm,
} from "../helpers";

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

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("hass") || changedProperties.has("forecast")) {
      this.suntimesInfo = getSuntimesInfo(this.hass, this.forecast.datetime);
    }
  }

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.forecast) {
      return nothing;
    }

    const dateInfo = this.getDateInfo();
    const isNightTime =
      this.forecastType === "hourly" &&
      this.config.forecast?.show_sun_times &&
      this.suntimesInfo
        ? this.suntimesInfo.isNightTime
        : false;

    const hasTwoRows = dateInfo.secondaryLabel !== undefined;

    return html`
      <div
        class="wfc-forecast-slot-time ${dateInfo.className || ""} ${hasTwoRows
          ? "wfc-two-rows"
          : ""}"
      >
        <span class="wfc-forecast-slot-time-primary">${dateInfo.label}</span>
        ${hasTwoRows
          ? html`<span class="wfc-forecast-slot-time-secondary"
              >${dateInfo.secondaryLabel}</span
            >`
          : nothing}
      </div>
      <wfc-weather-condition-icon-provider
        .hass=${this.hass}
        .config=${this.config}
        .state=${this.forecast.condition}
        .isNightTime=${isNightTime}
      ></wfc-weather-condition-icon-provider>
    `;
  }

  private getDateInfo(): {
    label: string;
    secondaryLabel?: string;
    className?: string;
  } {
    // Use two-row layout only for 12-hour (AM/PM) clock format
    const isAmPm = useAmPm(this.hass);

    if (this.forecastType !== "hourly") {
      if (isAmPm) {
        return {
          label: formatDay(this.hass, this.forecast.datetime),
          secondaryLabel: formatDayOfMonth(this.hass, this.forecast.datetime),
        };
      }
      return {
        label: formatDay(this.hass, this.forecast.datetime),
      };
    }

    // Hourly view
    const startDate = new Date(this.forecast.datetime);

    const endDate = this.forecast.groupEndtime
      ? new Date(this.forecast.groupEndtime)
      : endOfHour(startDate);

    let displayDate = startDate;
    let className: string | undefined;

    if (this.config.forecast?.show_sun_times && this.suntimesInfo) {
      const { sunrise, sunset } = this.suntimesInfo;

      const isEventInWindow = (eventDate: Date) => {
        const eventOnForecastDay = new Date(startDate);
        eventOnForecastDay.setHours(
          eventDate.getHours(),
          eventDate.getMinutes()
        );

        return (
          eventOnForecastDay.getTime() >= startDate.getTime() &&
          eventOnForecastDay.getTime() <= endDate.getTime()
        );
      };

      if (isEventInWindow(sunrise)) {
        className = "wfc-sunrise";
        displayDate = sunrise;
      } else if (isEventInWindow(sunset)) {
        className = "wfc-sunset";
        displayDate = sunset;
      }
    }

    // Sunrise/sunset times (with minutes)
    if (className) {
      const timeParts = formatTimeParts(this.hass, displayDate);
      return {
        label: timeParts.time,
        secondaryLabel: isAmPm ? timeParts.suffix : undefined,
        className,
      };
    }

    // Regular hourly forecast
    const hourParts = formatHourParts(this.hass, displayDate);
    return {
      label: hourParts.hour,
      secondaryLabel: isAmPm ? hourParts.suffix : undefined,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-header-items": WfcForecastHeaderItems;
  }
}
