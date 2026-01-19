import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ActionHandlerEvent, fireEvent } from "custom-card-helpers";
import { actionHandler } from "../hass";
import { DragScrollController } from "../controllers/drag-scroll-controller";
import {
  ExtendedHomeAssistant,
  ForecastActionDetails,
  WeatherForecastCardConfig,
} from "../types";
import { formatDay, getSuntimesInfo, groupForecastByCondition } from "../helpers";
import { getConditionColorNightAware } from "../data/condition-colors";
import { logger } from "../logger";
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
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  private _selectedForecastIndex: number | null = null;
  private _scrollController = new DragScrollController(this, {
    selector: ".wfc-scroll-container",
    childSelector: ".wfc-forecast-slot",
  });

  private _iconRaf = 0;
  private _iconCleanup?: () => void;

  protected createRenderRoot() {
    return this;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._iconRaf) {
      cancelAnimationFrame(this._iconRaf);
      this._iconRaf = 0;
    }
    this._iconCleanup?.();
    this._iconCleanup = undefined;
  }

  protected updated(): void {
    this._ensureIconListeners();
    this._scheduleIconUpdate();
  }
  render(): TemplateResult | typeof nothing {
    if (!this.forecast?.length) {
      return nothing;
    }

    const useGroupedIcons = this.config.forecast?.group_condition_icons ?? false;
    const forecastTemplates: TemplateResult[] = [];
    const maxPrecipitation = getMaxPrecipitationForUnit(
      getWeatherUnit(this.hass, this.weatherEntity, "precipitation"),
      this.forecastType
    );

    let currentDay: string | undefined;

    if (useGroupedIcons) {
      const timeRow: TemplateResult[] = [];
      const spanRow: TemplateResult[] = [];
      const detailRow: TemplateResult[] = [];
      const conditionSpans = groupForecastByCondition(this.forecast, this.hass);

      logger.info(
        `simple: grouping enabled, forecastType=${this.forecastType}, spans=${conditionSpans.length}, items=${this.forecast.length}`
      );

      this.forecast.forEach((forecast, index) => {
        if (!forecast.datetime) {
          return;
        }

        // Check for day change and add day indicator
        if (this.forecastType === "hourly") {
          const forecastDay = formatDay(this.hass, forecast.datetime);
          if (currentDay !== forecastDay) {
            currentDay = forecastDay;
            timeRow.push(
              html`<div class="wfc-day-indicator-container">
                <div class="wfc-day-indicator wfc-label">${forecastDay}</div>
              </div>`
            );
          }
        }

        // Time labels only
        timeRow.push(html`
          <div class="wfc-forecast-slot" data-index=${index}>
            <wfc-forecast-header-items
              .hass=${this.hass}
              .forecast=${forecast}
              .forecastType=${this.forecastType}
              .config=${this.config}
              .hideIcon=${true}
              .hideTime=${false}
            ></wfc-forecast-header-items>
          </div>
        `);

        // Condition spans
        const conditionSpan = conditionSpans.find(span => span.startIndex === index);
        if (conditionSpan) {
          // Get background color for this condition
          const useColors = this.config.forecast?.condition_colors ?? true;
          const isNightTime =
            this.forecastType === "hourly" &&
            this.config.forecast?.show_sun_times
              ? getSuntimesInfo(this.hass, forecast.datetime)?.isNightTime ?? false
              : false;

          const colors = useColors
            ? getConditionColorNightAware(
                forecast.condition,
                isNightTime,
                this.config.forecast?.condition_color_map
              )
            : {};
          const bgStyle = colors.background ? `background-color: ${colors.background};` : '';
          
          spanRow.push(html`
            <div 
              class="wfc-forecast-condition-span" 
              style="grid-column: span ${conditionSpan.count}; ${bgStyle}"
            >
              <div class="wfc-condition-icon-sticky">
                <wfc-forecast-header-items
                  .hass=${this.hass}
                  .forecast=${forecast}
                  .forecastType=${this.forecastType}
                  .config=${this.config}
                  .hideTime=${true}
                  .hideIcon=${false}
                ></wfc-forecast-header-items>
              </div>
            </div>
          `);
        }

        // Details and info per slot
        detailRow.push(html`
          <div class="wfc-forecast-slot" data-index=${index}>
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

      forecastTemplates.push(html`
        <div class="wfc-forecast-grouped-wrapper">
          <div class="wfc-forecast-time-row">${timeRow}</div>
          <div 
            class="wfc-forecast-span-row"
            style="grid-template-columns: repeat(${this.forecast.length}, var(--forecast-item-width));"
          >
            ${spanRow}
          </div>
          <div class="wfc-forecast-row">${detailRow}</div>
        </div>
      `);
    } else {
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
    }

    return html`
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

  private _ensureIconListeners(): void {
    if (this._iconCleanup) return;

    const container = this.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement | null;
    if (!container) return;

    const onScroll = () => this._scheduleIconUpdate();
    const onResize = () => this._scheduleIconUpdate();

    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    this._iconCleanup = () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }

  private _scheduleIconUpdate(): void {
    if (this._iconRaf) {
      cancelAnimationFrame(this._iconRaf);
    }
    this._iconRaf = requestAnimationFrame(() => this._updateIconPositions());
  }

  private _updateIconPositions(): void {
    const container = this.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement | null;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const icons = container.querySelectorAll<HTMLElement>(
      ".wfc-forecast-condition-span .wfc-condition-icon-sticky"
    );

    icons.forEach(icon => {
      const span = icon.closest(
        ".wfc-forecast-condition-span"
      ) as HTMLElement | null;
      if (!span) return;

      const spanRect = span.getBoundingClientRect();
      const iconWidth = icon.getBoundingClientRect().width || icon.offsetWidth || 48;

      const spanStartInContainer = spanRect.left - containerRect.left;
      const centerInContainer = spanStartInContainer + spanRect.width / 2;

      const minCenter = iconWidth / 2;
      const maxCenter = containerRect.width - iconWidth / 2;
      const clampedCenter = Math.min(Math.max(centerInContainer, minCenter), maxCenter);

      const offsetWithinSpan = clampedCenter - spanStartInContainer - iconWidth / 2;
      icon.style.setProperty("--icon-offset", `${offsetWithinSpan}px`);
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-simple": WfcForecastSimple;
  }
}
