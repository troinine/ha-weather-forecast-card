import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { DragScrollController } from "../controllers/drag-scroll-controller";
import { formatDay } from "../helpers";
import { styleMap } from "lit/directives/style-map.js";
import { classMap } from "lit/directives/class-map.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { getRelativePosition } from "chart.js/helpers";
import { actionHandler } from "../hass";
import { logger } from "../logger";
import { ActionHandlerEvent, fireEvent } from "custom-card-helpers";
import {
  CHART_ATTRIBUTES,
  ChartAttributes,
  CurrentWeatherAttributes,
  DEFAULT_CHART_ATTRIBUTE,
  ExtendedHomeAssistant,
  ForecastActionDetails,
  WeatherForecastCardConfig,
} from "../types";
import {
  ForecastAttribute,
  ForecastType,
  formatPrecipitation,
  formatTemperature,
  getMaxPrecipitationForUnit,
  getWeatherUnit,
  WEATHER_ATTRIBUTE_ICON_MAP,
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
  ScriptableContext,
  Color,
  ChartDataset,
  ChartOptions,
} from "chart.js";

import "./wfc-forecast-header-items";
import "./dropdown/wfc-chart-attribute-selector";
import { merge } from "lodash-es";

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

type ForecastLineType = "temperature" | "templow";

type ForecastLineStyle = Pick<
  ChartDataset<"line">,
  | "borderColor"
  | "pointBackgroundColor"
  | "pointBorderColor"
  | "fill"
  | "borderDash"
>;

// A safe maximum canvas width to avoid exceeding browser limits. This limit covers
// most of the modern mobile and desktop browsers and covers enough forecast data
// for reliable forecast information. This roughly covers over 300 forecast items
// which should be more than enough to provide a reliable forecast view.
const MAX_CANVAS_WIDTH = 16384;

// If the label value is longer than this, only render every second label to avoid clutter.
const MIN_RENDER_EVERY_SECOND_LABEL = 6;

/**
 * A chart component to display weather forecast data.
 *
 * It supports both daily and hourly forecasts, rendering temperature and precipitation data.
 * This component manages its own chart instance and updates it based on property changes.
 *
 * Note: As canvas width limits vary between browsers, this component enforces a conservative
 * hard maximum canvas width (MAX_CANVAS_WIDTH) chosen to provide broad browser compatibility.
 */
@customElement("wfc-forecast-chart")
export class WfcForecastChart extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) forecast: ForecastAttribute[] = [];
  @property({ attribute: false }) config!: WeatherForecastCardConfig;
  @property({ attribute: false }) forecastType!: ForecastType;
  @property({ attribute: false }) isTwiceDailyEntity = false;
  @property({ attribute: false }) itemWidth: number = 0;
  @property({ attribute: false }) isScrollable = false;
  @query("canvas") private _canvas?: HTMLCanvasElement;

  @state() private _settingsOpen = false;
  @state() private _selectedAttribute: ChartAttributes =
    DEFAULT_CHART_ATTRIBUTE;

  private _lastChartEvent: PointerEvent | null = null;
  private _chart: Chart | null = null;
  private _temperatureColors: Record<string, string> | null = null;
  private _scrollController = new DragScrollController(this, {
    selector: ".wfc-scroll-container",
    childSelector: ".wfc-forecast-slot",
  });

  protected createRenderRoot() {
    return this;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._chart?.destroy();
    this._chart = null;
  }

  protected firstUpdated(): void {
    if (this.config?.forecast?.default_chart_attribute) {
      this._selectedAttribute = this.config.forecast.default_chart_attribute;
    }
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
    const forecast = this.safeForecast;
    if (!forecast?.length || this.itemWidth <= 0) {
      return nothing;
    }

    const count = forecast.length;
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
        class="${classMap({
          "wfc-forecast-chart-settings": true,
          "has-selector": !!this.config.forecast?.show_attribute_selector,
        })}"
      >
        ${this.config.forecast?.show_attribute_selector
          ? html`<span>${this._localizeSelectedAttribute()}</span>
              <div class="wfc-forecast-chart-attribute-selector">
                <ha-button
                  class="wfc-settings-toggle-button"
                  size="small"
                  appearance="filled"
                  variant="brand"
                  @click=${this._onSettingsToggle}
                >
                  <ha-icon
                    .icon=${this._settingsOpen
                      ? "mdi:close"
                      : this._selectedAttribute ===
                          "temperature_and_precipitation"
                        ? "mdi:water-thermometer"
                        : WEATHER_ATTRIBUTE_ICON_MAP[
                            this
                              ._selectedAttribute as keyof typeof WEATHER_ATTRIBUTE_ICON_MAP
                          ]}
                  ></ha-icon>
                </ha-button>
              </div>`
          : nothing}
        <wfc-chart-attribute-selector
          .open=${this._settingsOpen}
          .options=${this._getChartOptions()}
          .value=${this._selectedAttribute}
          @selected=${this._onAttributesSelected}
          @closed=${this._onSettingsClosed}
        ></wfc-chart-attribute-selector>
      </div>
      <div
        class="${classMap({
          "wfc-mask-container": true,
          "is-scrollable": this.isScrollable,
        })}"
      >
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
          <div class="wfc-forecast-chart-header">
            ${this.renderHeaderItems(forecast)}
          </div>

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
            ${forecast.map(
              (item, index) => html`
                <div class="wfc-forecast-slot" data-index=${index}>
                  <wfc-forecast-info
                    .hass=${this.hass}
                    .weatherEntity=${this.weatherEntity}
                    .forecast=${item}
                    .config=${this.config}
                    .hidePrecipitation=${true}
                  ></wfc-forecast-info>
                </div>
              `
            )}
          </div>
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
   * When the chart type changes (e.g., from bar to line when switching attributes), the chart
   * must be destroyed and recreated since Chart.js doesn't support changing the root type after
   * initialization.
   *
   * @param structuralChange Whether the chart's layout or structure has changed, requiring a forced resize.
   */
  private updateChartData(structuralChange: boolean = false): void {
    if (!this._chart || !this.forecast?.length) return;

    const newConfig = this.getChartConfig();
    const currentType = (this._chart.config as ChartConfiguration).type;
    const newType = newConfig.type;

    // Chart.js doesn't support changing the root type after initialization.
    // When the chart type changes, we need to destroy and recreate the chart.
    if (currentType !== newType) {
      this._chart.destroy();
      this._chart = null;
      this.initChart();
      return;
    }

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
    const data = this.safeForecast;
    const style = getComputedStyle(this);
    const gridColor = style.getPropertyValue("--wfc-chart-grid-color");

    const baseOptions: ChartOptions = {
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
      },
    };

    switch (this._selectedAttribute) {
      case "uv_index":
        return this._getUVIndexConfig(data, style, baseOptions);
      case "humidity":
      case "pressure":
      case "apparent_temperature":
        return this._getSelectedAttributeConfig(data, style, baseOptions);
      case "temperature_and_precipitation":
      default:
        return this._getDefaultWeatherConfig(data, style, baseOptions);
    }
  }

  private _getDefaultWeatherConfig(
    data: ForecastAttribute[],
    style: CSSStyleDeclaration,
    options: ChartOptions
  ): ChartConfiguration {
    const { minTemp, maxTemp } = this.computeScaleLimits(data);
    const highTempLabelColor = style.getPropertyValue(
      "--wfc-chart-temp-high-label-color"
    );
    const lowTempLabelColor = style.getPropertyValue(
      "--wfc-chart-temp-low-label-color"
    );
    const precipLabelColor = style.getPropertyValue(
      "--wfc-chart-precipitation-label-color"
    );
    const precipColor = style.getPropertyValue("--wfc-precipitation-bar-color");

    const maxPrecip = getMaxPrecipitationForUnit(
      getWeatherUnit(this.hass, this.weatherEntity, "precipitation"),
      this.forecastType
    );

    const tempLineStyle = this.getTemperatureLineStyle(style, "temperature");
    const templowLineStyle = this.getTemperatureLineStyle(style, "templow");

    return {
      type: "line",
      data: {
        labels: data.map((f) => f.datetime),
        datasets: [
          {
            data: data.map((f) => f.temperature),
            yAxisID: "yTemp",
            datalabels: {
              anchor: "end",
              align: "top",
              color: highTempLabelColor,
              formatter: (value) =>
                value != null
                  ? `${formatTemperature(this.hass, this.weatherEntity, value, this.config.forecast?.temperature_precision, true)}°`
                  : null,
            },
            ...tempLineStyle,
          },
          {
            data: data.map((f) => f.templow ?? null),
            yAxisID: "yTemp",
            datalabels: {
              anchor: "start",
              align: "bottom",
              color: lowTempLabelColor,
              formatter: (value) =>
                value != null
                  ? `${formatTemperature(this.hass, this.weatherEntity, value, this.config.forecast?.temperature_precision, true)}°`
                  : null,
            },
            ...templowLineStyle,
          },
          {
            type: "bar",
            data: data.map((f) =>
              f.precipitation && f.precipitation !== 0 ? f.precipitation : null
            ),
            backgroundColor: precipColor,
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
      options: merge({}, options, {
        scales: {
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
      }),
    };
  }

  private _getUVIndexConfig(
    data: ForecastAttribute[],
    style: CSSStyleDeclaration,
    options: ChartOptions
  ): ChartConfiguration {
    const defaultColor = style
      .getPropertyValue("--wfc-chart-uv-bar-color")
      .trim();
    const labelColor = style.getPropertyValue("--wfc-chart-label-color");

    const uvColors = {
      low: style.getPropertyValue("--wfc-uv-low").trim(),
      moderate: style.getPropertyValue("--wfc-uv-moderate").trim(),
      high: style.getPropertyValue("--wfc-uv-high").trim(),
      veryHigh: style.getPropertyValue("--wfc-uv-very-high").trim(),
      extreme: style.getPropertyValue("--wfc-uv-extreme").trim(),
    };

    const getUvColor = (value: number | null) => {
      if (value === null) return defaultColor;
      if (value >= 11) return uvColors.extreme;
      if (value >= 8) return uvColors.veryHigh;
      if (value >= 6) return uvColors.high;
      if (value >= 3) return uvColors.moderate;
      return uvColors.low;
    };

    return {
      type: "bar",
      data: {
        labels: data.map((f) => f.datetime),
        datasets: [
          {
            type: "bar",
            data: data.map((f) =>
              f.uv_index != null ? Math.round(f.uv_index) : 0
            ),
            backgroundColor: data.map((f) => getUvColor(f.uv_index ?? null)),
            borderWidth: 0,
            borderRadius: {
              topLeft: 5,
              topRight: 5,
            },
            categoryPercentage: 0.6,
            barPercentage: 0.8,
            order: 0,
            datalabels: {
              anchor: "start",
              align: "end",
              offset: -22,
              color: labelColor,
            },
          },
        ],
      },
      options: merge({}, options, {
        scales: {
          y: {
            display: false,
            beginAtZero: true,
            suggestedMax: 11,
          },
        },
      }),
    };
  }

  private _getSelectedAttributeConfig(
    data: ForecastAttribute[],
    style: CSSStyleDeclaration,
    options: ChartOptions
  ): ChartConfiguration {
    const attr = this._selectedAttribute as keyof ForecastAttribute;
    const colorVar =
      attr === "humidity"
        ? "--wfc-chart-humidity-line-color"
        : attr === "pressure"
          ? "--wfc-chart-pressure-line-color"
          : "--wfc-chart-temp-high-line-color";

    const color =
      style.getPropertyValue(colorVar) ||
      style.getPropertyValue("--wfc-chart-default-line-color");
    const labelColor = style.getPropertyValue("--wfc-chart-label-color");
    const unit = getWeatherUnit(this.hass, this.weatherEntity, attr);

    const values = data.map((f) => (f[attr] as number) ?? 0);
    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);
    const range = dataMax - dataMin || 1; // Fallback to 1 if all values are the same

    const chartMax = dataMax + range * 0.2;
    const chartMin = dataMin - range * 0.1;

    return {
      type: "line",
      data: {
        labels: data.map((f) => f.datetime),
        datasets: [
          {
            data: data.map((f) => (f[attr] as number) ?? null),
            borderColor: color,
            pointBackgroundColor: color,
            fill: false,
            datalabels: {
              anchor: "end",
              align: "top",
              color: labelColor,
              formatter: (value: number | null, context) => {
                if (value === null) return null;

                const formattedValue = `${value} ${unit}`;
                if (
                  formattedValue.length > MIN_RENDER_EVERY_SECOND_LABEL &&
                  context.dataIndex % 2 !== 0
                ) {
                  return null;
                }

                return formattedValue;
              },
            },
          },
        ],
      },
      options: merge({}, options, {
        scales: {
          y: {
            display: false,
            min: chartMin,
            max: chartMax,
          },
        },
      }),
    };
  }

  private getTemperatureLineStyle(
    componentStyle: CSSStyleDeclaration,
    type: ForecastLineType
  ): ForecastLineStyle {
    const colorVarName =
      type === "temperature"
        ? "--wfc-chart-temp-high-line-color"
        : "--wfc-chart-temp-low-line-color";

    const defaultColor = componentStyle.getPropertyValue(colorVarName);

    const lineColor = (context: ScriptableContext<"line">) =>
      this.computeTemperatureLineColor(context, componentStyle, defaultColor);

    return {
      borderColor: lineColor,
      pointBorderColor: lineColor,
      pointBackgroundColor: lineColor,
      borderDash:
        this.config.forecast?.use_color_thresholds && type === "templow"
          ? [4, 4]
          : undefined,
      fill: false,
    };
  }

  /**
   * Computes a CanvasGradient or Color for the temperature line based on the current chart context and configuration.
   *
   * If the `use_color_thresholds` option is enabled in the forecast configuration, this method generates gradient
   * transitions through predefined color stops corresponding to temperature ranges. The method caches the computed
   * colors for performance optimization. Otherwise just returns the default color for this temperature line.
   *
   * @param context - The chart context used to create the gradient.
   * @returns A CanvasGradient object representing the temperature gradient, or default color if thresholds are not used.
   */
  private computeTemperatureLineColor(
    context: ScriptableContext<"line">,
    componentStyle: CSSStyleDeclaration,
    defaultColor: string
  ): CanvasGradient | Color {
    if (!this.config.forecast?.use_color_thresholds) {
      return defaultColor;
    }

    const chart = context.chart;
    const { ctx, chartArea, scales } = chart;

    if (!chartArea || !scales.yTemp) {
      return defaultColor;
    }

    if (this._temperatureColors === null) {
      const style = componentStyle;

      this._temperatureColors = {
        cold: style.getPropertyValue("--wfc-temp-cold") || "#2196f3",
        freezing: style.getPropertyValue("--wfc-temp-freezing") || "#4fb3ff",
        chilly: style.getPropertyValue("--wfc-temp-chilly") || "#ffeb3b",
        mild: style.getPropertyValue("--wfc-temp-mild") || "#4caf50",
        warm: style.getPropertyValue("--wfc-temp-warm") || "#ff9800",
        hot: style.getPropertyValue("--wfc-temp-hot") || "#f44336",
      };
    }

    const yTemp = scales.yTemp;
    const { min, max } = yTemp;

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return defaultColor;
    }

    const gradient = ctx.createLinearGradient(
      0,
      chartArea.bottom,
      0,
      chartArea.top
    );

    const getPos = (temp: number) =>
      Math.max(0, Math.min(1, (temp - min) / (max - min)));

    const unit = getWeatherUnit(this.hass, this.weatherEntity, "temperature");
    const isFahrenheit = unit === "°F";

    const normalize = (celsius: number) =>
      isFahrenheit ? (celsius * 9) / 5 + 32 : celsius;

    const stops = [
      {
        pos: getPos(normalize(-10)),
        color: this._temperatureColors.cold,
      },
      {
        pos: getPos(normalize(0)),
        color: this._temperatureColors.freezing,
      },
      {
        pos: getPos(normalize(8)),
        color: this._temperatureColors.chilly,
      },
      {
        pos: getPos(normalize(18)),
        color: this._temperatureColors.mild,
      },
      {
        pos: getPos(normalize(26)),
        color: this._temperatureColors.warm,
      },
      {
        pos: getPos(normalize(34)),
        color: this._temperatureColors.hot,
      },
    ].sort((a, b) => a.pos - b.pos);

    for (const stop of stops) {
      gradient.addColorStop(stop.pos, stop.color!);
    }

    return gradient;
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
   * @param forecast - The forecast data to compute the scale limits for.
   * @returns An object containing `minTemp` and `maxTemp` properties.
   */
  private computeScaleLimits(forecast: ForecastAttribute[]): {
    minTemp: number;
    maxTemp: number;
  } {
    const temps = forecast.map((f) => f.temperature);
    const lows = forecast.map((f) => f.templow ?? f.temperature);

    const dataMin = Math.min(...lows);
    const dataMax = Math.max(...temps);

    const hasLowTempData = forecast.some(
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

  private renderHeaderItems(forecast: ForecastAttribute[]): TemplateResult[] {
    const parts: TemplateResult[] = [];
    let currentDay: string | undefined;

    forecast.forEach((item, index) => {
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
        <div class="wfc-forecast-slot" data-index=${index}>
          <wfc-forecast-header-items
            .hass=${this.hass}
            .forecast=${item}
            .forecastType=${this.forecastType}
            .isTwiceDailyEntity=${this.isTwiceDailyEntity}
            .config=${this.config}
          ></wfc-forecast-header-items>
        </div>
      `);
    });

    return parts;
  }

  /**
   * Returns a subset of the forecast that fits within the hardware canvas limit.
   * This calculation includes the gap width to ensure exact layout synchronization.
   */
  private get safeForecast(): ForecastAttribute[] {
    if (!this.forecast?.length || this.itemWidth <= 0) return [];

    const gap = this._getGapValue();

    const maxItems = Math.floor(
      (MAX_CANVAS_WIDTH + gap) / (this.itemWidth + gap)
    );

    if (this.forecast.length > maxItems) {
      logger.debug(
        `Truncating forecast to ${maxItems} items to stay under ${MAX_CANVAS_WIDTH}px (including ${gap}px gaps).`
      );

      return this.forecast.slice(0, maxItems);
    }

    return this.forecast;
  }

  private _getGapValue(): number {
    const style = getComputedStyle(this);

    const gapValue = style.getPropertyValue("--forecast-item-gap").trim();

    return parseFloat(gapValue) || 0;
  }

  private _onPointerDown(event: PointerEvent) {
    this._lastChartEvent = event;
  }

  private _onForecastAction = (event: ActionHandlerEvent): void => {
    if (this._scrollController.isScrolling()) {
      return;
    }

    if (
      this.config.forecast_action?.hold_action?.action ===
        "select-forecast-attribute" &&
      event.detail.action === "hold"
    ) {
      event.preventDefault();
      event.stopPropagation();

      this._settingsOpen = true;

      return;
    }

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

    const selectedForecast = this.safeForecast[index];
    if (!selectedForecast) return;

    const actionDetails: ForecastActionDetails = {
      selectedForecast,
      action: event.detail.action,
    };

    fireEvent(this, "action", actionDetails);
  };

  private _onSettingsToggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this._settingsOpen = !this._settingsOpen;
  }

  private _localizeSelectedAttribute(): string {
    if (this._selectedAttribute === "temperature_and_precipitation") {
      return this.hass.localize("ui.card.weather.forecast");
    }

    return (
      this.hass.formatEntityAttributeName(
        this.weatherEntity,
        this._selectedAttribute
      ) || this.hass.localize("ui.card.weather.forecast")
    );
  }

  private _getChartOptions(): {
    label: string;
    value: ChartAttributes;
    icon: string;
  }[] {
    const forecast = this.forecast;

    const hasData = (attr: string): boolean => {
      if (attr === "temperature_and_precipitation") {
        return true;
      }

      return forecast.some((f) => {
        const value = f[attr as keyof ForecastAttribute];
        return value != null;
      });
    };

    return CHART_ATTRIBUTES.filter(hasData).map((attr) => ({
      label:
        attr === "temperature_and_precipitation"
          ? `${this.hass.formatEntityAttributeName(this.weatherEntity, "temperature")}, ${this.hass.localize("ui.card.weather.attributes.precipitation")}`
          : this.hass.formatEntityAttributeName(this.weatherEntity, attr) ||
            attr,
      icon:
        attr === "temperature_and_precipitation"
          ? "mdi:water-thermometer"
          : WEATHER_ATTRIBUTE_ICON_MAP[attr as CurrentWeatherAttributes],
      value: attr,
    }));
  }

  private _onAttributesSelected(e: CustomEvent): void {
    this._settingsOpen = false;
    this._selectedAttribute = e.detail.value;
    this.updateChartData(false);
  }

  private _onSettingsClosed(): void {
    this._settingsOpen = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-chart": WfcForecastChart;
  }
}
