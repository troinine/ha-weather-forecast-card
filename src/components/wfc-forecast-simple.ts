import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators.js";
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
  @property({ attribute: false }) itemWidth = 0;
  @property({ attribute: false }) historyCount = 0;
  @property({ attribute: false }) historyLoading = false;
  @property({ attribute: false }) historyHasMore = false;
  @query(".wfc-scroll-container") private _scrollContainer?: HTMLElement;

  private _selectedForecastIndex: number | null = null;
  private _scrollController = new DragScrollController(this, {
    selector: ".wfc-scroll-container",
    childSelector: ".wfc-forecast-slot",
  });

  protected createRenderRoot() {
    return this;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      this.forecastType !== "hourly" ||
      this.historyCount <= 0 ||
      !this._scrollContainer ||
      this.itemWidth <= 0
    ) {
      return;
    }

    const oldHistoryCount =
      (changedProps.get("historyCount") as number | undefined) ?? 0;
    const forecastTypeChanged = changedProps.has("forecastType");

    requestAnimationFrame(() => {
      if (!this._scrollContainer) {
        return;
      }

      if (forecastTypeChanged || oldHistoryCount === 0) {
        this._scrollContainer.scrollLeft = this.historyCount * this.itemWidth;
      } else if (this.historyCount > oldHistoryCount) {
        this._scrollContainer.scrollLeft +=
          (this.historyCount - oldHistoryCount) * this.itemWidth;
      }
    });
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
        <div
          class=${classMap({
            "wfc-forecast-slot": true,
            "wfc-history-slot": index < this.historyCount,
            "wfc-now-slot":
              this.historyCount > 0 && index === this.historyCount,
          })}
          data-index=${index}
          data-now-label=${this._nowLabel()}
        >
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
        ${this.historyLoading
          ? html`<div
              class="wfc-history-loading"
              role="status"
              aria-label="Loading historical weather"
            ></div>`
          : nothing}
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
          @scroll=${this._onScroll}
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
    if (
      this.historyCount > 0 &&
      this._selectedForecastIndex <= this.historyCount
    ) {
      return;
    }

    const actionDetails: ForecastActionDetails = {
      selectedForecast,
      action: event.detail.action,
    };

    fireEvent(this, "action", actionDetails);
  };

  private _onScroll = (): void => {
    if (
      !this._scrollContainer ||
      !this.historyHasMore ||
      this.historyLoading ||
      this.historyCount === 0
    ) {
      return;
    }

    const threshold = Math.max(this.itemWidth * 1.5, 80);
    if (this._scrollContainer.scrollLeft <= threshold) {
      this.dispatchEvent(
        new CustomEvent("history-load-requested", {
          bubbles: true,
          composed: true,
        })
      );
    }
  };

  private _nowLabel(): string {
    const key = "ui.common.now";
    const localized = this.hass.localize(key);
    return localized && localized !== key ? localized : "Now";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-simple": WfcForecastSimple;
  }
}
