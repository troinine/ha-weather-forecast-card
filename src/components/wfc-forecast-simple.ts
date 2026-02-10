import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ActionHandlerEvent, fireEvent } from "custom-card-helpers";
import { actionHandler } from "../hass";
import { DragScrollController } from "../controllers/drag-scroll-controller";
import {
  ExtendedHomeAssistant,
  ForecastActionDetails,
  WeatherForecastCardConfig,
} from "../types";
import { formatDay } from "../helpers";
import {
  ForecastAttribute,
  ForecastType,
  getMaxPrecipitationForUnit,
  getWeatherUnit,
  WeatherEntity,
} from "../data/weather";

import "./wfc-forecast-header-items";
import "./wfc-forecast-details";
import "./wfc-forecast-info";

@customElement("wfc-forecast-simple")
export class WfcForecastSimple extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) forecast: ForecastAttribute[] = [];
  @property({ attribute: false }) forecastType!: ForecastType;
  @property({ attribute: false }) isTwiceDailyEntity = false;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;
  @property({ attribute: false }) isScrollable = false;

  private _selectedForecastIndex: number | null = null;
  private _scrollController = new DragScrollController(this, {
    selector: ".wfc-scroll-container",
    childSelector: ".wfc-forecast-slot",
  });

  protected createRenderRoot() {
    return this;
  }

  render(): TemplateResult | typeof nothing {
    if (!this.forecast?.length) {
      return nothing;
    }

    const forecastTemplates: TemplateResult[] = [];
    const maxPrecipitation = getMaxPrecipitationForUnit(
      getWeatherUnit(this.hass, this.weatherEntity, "precipitation"),
      this.forecastType
    );

    let currentDay: string | undefined;

    this.forecast.forEach((forecast, index) => {
      if (!forecast.datetime) {
        return;
      }

      if (this.forecastType === "hourly") {
        const forecastDay = formatDay(this.hass, forecast.datetime);
        if (currentDay !== forecastDay) {
          currentDay = forecastDay;
          forecastTemplates.push(
            html`<div class="wfc-day-indicator-container">
              <div class="wfc-day-indicator wfc-label">${forecastDay}</div>
            </div>`
          );
        }
      }

      forecastTemplates.push(html`
        <div class="wfc-forecast-slot" data-index=${index}>
          <wfc-forecast-header-items
            .hass=${this.hass}
            .forecast=${forecast}
            .forecastType=${this.forecastType}
            .isTwiceDailyEntity=${this.isTwiceDailyEntity}
            .config=${this.config}
          ></wfc-forecast-header-items>
          <wfc-forecast-details
            .hass=${this.hass}
            .forecast=${forecast}
            .maxPrecipitation=${maxPrecipitation}
            .config=${this.config}
          ></wfc-forecast-details>
          <wfc-forecast-info
            .hass=${this.hass}
            .weatherEntity=${this.weatherEntity}
            .forecast=${forecast}
            .config=${this.config}
          ></wfc-forecast-info>
        </div>
      `);
    });

    return html`
      <div
        class="${classMap({
          "wfc-mask-container": true,
          "is-scrollable": this.isScrollable,
        })}"
      >
        <div
          class="wfc-forecast wfc-scroll-container"
          .actionHandler=${actionHandler({
            hasHold: this.config.forecast_action?.hold_action !== undefined,
            hasDoubleClick:
              this.config.forecast_action?.double_tap_action !== undefined,
            stopPropagation: true,
          })}
          @action=${this._onForecastAction}
          @pointerdown=${this._onPointerDown}
        >
          ${forecastTemplates}
        </div>
      </div>
    `;
  }

  private _onPointerDown = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    const slot = target?.closest(".wfc-forecast-slot") as HTMLElement | null;

    this._selectedForecastIndex = slot?.dataset.index
      ? Number(slot.dataset.index)
      : null;
  };

  private _onForecastAction = (event: ActionHandlerEvent): void => {
    if (this._scrollController.isScrolling()) {
      return;
    }

    if (this._selectedForecastIndex === null) return;

    event.preventDefault();
    event.stopPropagation();

    const selectedForecast = this.forecast[this._selectedForecastIndex];

    if (!selectedForecast) return;

    const actionDetails: ForecastActionDetails = {
      selectedForecast,
      action: event.detail.action,
    };

    fireEvent(this, "action", actionDetails);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-simple": WfcForecastSimple;
  }
}
