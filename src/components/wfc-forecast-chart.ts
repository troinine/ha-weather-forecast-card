import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import {
  ExtendedHomeAssistant,
  ForecastActionDetails,
  WeatherForecastCardConfig,
} from "../types";
import {
  ActionHandlerEvent,
  fireEvent,
  formatNumber,
} from "custom-card-helpers";
import { formatDay } from "../helpers";
import { styleMap } from "lit/directives/style-map.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { getRelativePosition } from "chart.js/helpers";
import { actionHandler } from "../hass";
import {
  ForecastAttribute,
  ForecastType,
  formatPrecipitation,
  getMaxPrecipitationForUnit,
  getWeatherUnit,
  WeatherEntity,
} from "../data/weather";
import {
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Chart,
  BarController,
  BarElement,
  ChartConfiguration,
} from "chart.js";

import "./wfc-forecast-header-items";

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ChartDataLabels
);

@customElement("wfc-forecast-chart")
export class WfcForecastChart extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) forecast: ForecastAttribute[] = [];
  @property({ attribute: false }) config!: WeatherForecastCardConfig;
  @property({ attribute: false }) forecastType!: ForecastType;
  @property({ attribute: false }) itemWidth: number = 0;
  @query("canvas") private _canvas?: HTMLCanvasElement;

  private _lastChartEvent: PointerEvent | null = null;
  private _chart: Chart | null = null;

  protected createRenderRoot() {
    return this;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._chart?.destroy();
    this._chart = null;
  }

  protected firstUpdated(): void {
    this.initChart();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const hasChanged =
      changedProps.has("forecast") ||
      changedProps.has("weatherEntity") ||
      changedProps.has("hass") ||
      changedProps.has("forecastType") ||
      changedProps.has("itemWidth");

    if (hasChanged && this.itemWidth > 0 && this.forecast?.length) {
      if (!this._chart) {
        this.initChart();
      } else {
        const structuralChange =
          changedProps.has("forecastType") || changedProps.has("itemWidth");
        this.updateChartData(structuralChange);
      }
    }
  }

  render(): TemplateResult | typeof nothing {
    if (!this.forecast?.length || this.itemWidth <= 0) {
      return nothing;
    }

    const count = this.forecast.length;
    const gaps = Math.max(count - 1, 0);

    const totalWidthCalc = `calc(${count} * var(--forecast-item-width) + ${gaps} * var(--forecast-item-gap))`;

    const scrollContainerStyle = {
      "--wfc-forecast-chart-width": totalWidthCalc,
    };

    const clipperStyle = {
      width: "var(--wfc-forecast-chart-width)",
      overflow: "hidden",
    };

    const canvasStyle = {
      width: "calc(var(--wfc-forecast-chart-width) + var(--forecast-item-gap))",
      marginLeft: "calc(var(--forecast-item-gap) / -2)",
      display: "block",
    };

    return html`
      <div
        class="wfc-scroll-container"
        style=${styleMap(scrollContainerStyle)}
        .actionHandler=${actionHandler({
          hasHold: this.config.forecast_action?.hold_action !== undefined,
          hasDoubleClick:
            this.config.forecast_action?.double_tap_action !== undefined,
          stopPropagation: true,
        })}
        @pointerdown=${this._onPointerDown}
        @action=${this._onForecastAction}
      >
        <div class="wfc-forecast-chart-header">${this.renderHeaderItems()}</div>

        <div class="wfc-chart-clipper" style=${styleMap(clipperStyle)}>
          <div
            class="wfc-forecast-chart"
            id="chart-container"
            style=${styleMap(canvasStyle)}
          >
            <canvas id="forecast-canvas"></canvas>
          </div>
        </div>

        <div class="wfc-forecast-chart-footer">
          ${this.forecast.map(
            (item) => html`
              <div class="wfc-forecast-slot">
                <wfc-forecast-info
                  .hass=${this.hass}
                  .forecast=${item}
                  .config=${this.config}
                  .hidePrecipitation=${true}
                ></wfc-forecast-info>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private initChart(): void {
    if (!this._canvas || !this.forecast?.length) return;

    const config = this.getChartConfig();
    if (config) {
      this._chart = new Chart(this._canvas, config);
    }
  }

  /**
   * Update the chart's data and configuration.
   *
   * This method updates the chart's data and configuration based on the current forecast data.
   * It also handles resizing the chart if there has been a structural change, such as switching
   * between daily and hourly forecasts or changing the item width.
   *
   * @param structuralChange Whether the chart's layout or structure has changed, requiring a forced resize.
   */
  private updateChartData(structuralChange: boolean = false): void {
    if (!this._chart || !this.forecast?.length) return;

    const newConfig = this.getChartConfig();

    this._chart.data = newConfig.data;

    if (this._chart.options.scales && newConfig.options?.scales) {
      this._chart.options.scales = newConfig.options.scales;
    }

    if (structuralChange) {
      this._chart.resize();
    }

    // No animation on data update.
    this._chart.update("none");
  }

  private getChartConfig(): ChartConfiguration {
    const style = getComputedStyle(this);
    const gridColor = style.getPropertyValue("--wfc-chart-grid-color");
    const highTempLabelColor = style.getPropertyValue(
      "--wfc-chart-temp-high-label-color"
    );
    const lowTempLabelColor = style.getPropertyValue(
      "--wfc-chart-temp-low-label-color"
    );
    const precipLabelColor = style.getPropertyValue(
      "--wfc-chart-precipitation-label-color"
    );
    const highColor = style.getPropertyValue(
      "--wfc-chart-temp-high-line-color"
    );
    const lowColor = style.getPropertyValue("--wfc-chart-temp-low-line-color");
    const precipColor = style.getPropertyValue(
      "--wfc-chart-precipitation-bar-color"
    );

    const { minTemp, maxTemp } = this.computeScaleLimits();

    const maxPrecip = getMaxPrecipitationForUnit(
      getWeatherUnit(this.hass, this.weatherEntity, "precipitation"),
      this.forecastType
    );

    return {
      type: "line",
      data: {
        labels: this.forecast.map((f) => f.datetime),
        datasets: [
          {
            data: this.forecast.map((f) => f.temperature),
            borderColor: highColor,
            fill: false,
            yAxisID: "yTemp",
            datalabels: {
              anchor: "end",
              align: "top",
              color: highTempLabelColor,
              formatter: (value) =>
                value != null
                  ? `${formatNumber(value, this.hass.locale)}°`
                  : null,
            },
          },
          {
            data: this.forecast.map((f) => f.templow ?? null),
            borderColor: lowColor,
            fill: false,
            yAxisID: "yTemp",
            datalabels: {
              anchor: "start",
              align: "bottom",
              color: lowTempLabelColor,
              formatter: (value) =>
                value != null
                  ? `${formatNumber(value, this.hass.locale)}°`
                  : null,
            },
          },
          {
            data: this.forecast.map((f) =>
              f.precipitation && f.precipitation !== 0 ? f.precipitation : null
            ),
            backgroundColor: precipColor,
            type: "bar",
            yAxisID: "yPrecip",
            borderWidth: 0,
            borderRadius: {
              topLeft: 3,
              topRight: 3,
            },
            categoryPercentage: 0.6,
            barPercentage: 0.8,
            order: 0,
            datalabels: {
              anchor: "start",
              align: "end",
              offset: -22,
              color: precipLabelColor,
              formatter: (value: number) =>
                formatPrecipitation(
                  value,
                  getWeatherUnit(this.hass, this.weatherEntity, "precipitation")
                ),
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          autoPadding: false,
          padding: {
            top: 10,
            bottom: 10,
            left: 0,
            right: 0,
          },
        },
        elements: {
          line: {
            tension: 0.3,
          },
        },
        scales: {
          x: {
            offset: true,
            border: {
              color: gridColor,
              dash: [4, 4],
            },
            grid: {
              offset: true,
              display: true,
              color: gridColor,
              drawTicks: true,
            },
            ticks: {
              display: false,
            },
          },
          yTemp: {
            type: "linear",
            display: false,
            min: minTemp,
            max: maxTemp,
            position: "left",
            grid: {
              display: false,
            },
            ticks: {
              display: false,
            },
          },
          yPrecip: {
            type: "linear",
            display: false,
            position: "right",
            beginAtZero: true,
            suggestedMin: 0,
            suggestedMax: maxPrecip,
            grid: {
              display: false,
              drawOnChartArea: false,
            },
            ticks: {
              display: false,
            },
          },
        },
      },
    };
  }

  /**
   * Computes the Y-axis boundaries (min and max) for the temperature scale.
   *
   * This algorithm calculates "artificial" padding to prevent data labels from being pushed
   * outside the chart area. It specifically addresses the issue where low-temperature labels
   * (which hang below the data point) get clipped by the x-axis.
   *
   * The algorithm follows these steps:
   *
   *   1. Identify the absolute min and max from the forecast.
   *   2. Enforce a minimum range of 10° to prevent the chart from looking "flat" or jittery on stable days.
   *   3. Apply dynamic padding based on the spread, heavily favoring the bottom (35% when low temps are available, otherwise 10%) over the top (20%) to accommodate labels hanging below the line.
   *   4. Enforces a hard minimum buffer (5° at the bottom) to guarantee sufficient "degree distance" for labels, regardless of how condensed the chart scale is.
   *   5. Round values to the nearest integer for cleaner grid lines.
   *
   * @returns An object containing `minTemp` and `maxTemp` properties.
   */
  private computeScaleLimits(): { minTemp: number; maxTemp: number } {
    const temps = this.forecast.map((f) => f.temperature);
    const lows = this.forecast.map((f) => f.templow ?? f.temperature);

    const dataMin = Math.min(...lows);
    const dataMax = Math.max(...temps);

    const hasLowTempData = this.forecast.some(
      (f) => f.templow !== undefined && f.templow !== null
    );

    const spread = Math.max(dataMax - dataMin, 10);
    const topPaddingFactor = 0.2;
    const bottomPaddingFactor = hasLowTempData ? 0.35 : 0.1;
    const dynamicTop = spread * topPaddingFactor;
    const dynamicBottom = spread * bottomPaddingFactor;

    const MIN_TOP_BUFFER = 2;
    const MIN_BOTTOM_BUFFER = hasLowTempData ? 5 : 1;

    const topPadding = Math.max(dynamicTop, MIN_TOP_BUFFER);
    const bottomPadding = Math.max(dynamicBottom, MIN_BOTTOM_BUFFER);

    const minTemp = Math.floor(dataMin - bottomPadding);
    let maxTemp = Math.ceil(dataMax + topPadding);

    if (minTemp >= maxTemp) {
      maxTemp = minTemp + 1;
    }

    return { minTemp, maxTemp };
  }

  private renderHeaderItems(): TemplateResult[] {
    const parts: TemplateResult[] = [];
    let currentDay: string | undefined;

    this.forecast.forEach((item) => {
      if (!item.datetime) {
        return;
      }

      if (this.forecastType === "hourly") {
        const forecastDay = formatDay(this.hass, item.datetime);
        if (currentDay !== forecastDay) {
          currentDay = forecastDay;
          parts.push(
            html`<div class="wfc-day-indicator-container">
              <div class="wfc-day-indicator wfc-label">${forecastDay}</div>
            </div>`
          );
        }
      }

      parts.push(html`
        <div class="wfc-forecast-slot">
          <wfc-forecast-header-items
            .hass=${this.hass}
            .forecast=${item}
            .forecastType=${this.forecastType}
            .config=${this.config}
          ></wfc-forecast-header-items>
        </div>
      `);
    });

    return parts;
  }

  private _onPointerDown(event: PointerEvent) {
    this._lastChartEvent = event;
  }

  private _onForecastAction = (event: ActionHandlerEvent): void => {
    if (!this._chart || !this._lastChartEvent) {
      return;
    }

    const lastChartEvent = this._lastChartEvent;
    this._lastChartEvent = null;

    event.preventDefault();
    event.stopPropagation();

    const canvasPosition = getRelativePosition(lastChartEvent, this._chart);

    const xScale = this._chart.scales.x;
    if (!xScale) return;

    const dataX = xScale.getValueForPixel(canvasPosition.x);
    if (dataX === null || dataX === undefined) return;

    const label = xScale.getLabelForValue(dataX);
    const index = this._chart.data.labels?.indexOf(label as string) ?? -1;
    if (index === -1) return;

    const selectedForecast = this.forecast[index];
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
    "wfc-forecast-chart": WfcForecastChart;
  }
}
