import { merge } from "lodash-es";
import { property, state } from "lit/decorators.js";
import { styles } from "./weather-forecast-card.styles";
import { createWarningText } from "./helpers";
import { logger } from "./logger";
import { actionHandler } from "./hass/action-handler-directive";
import { ForecastMode } from "./types";
import {
  LitElement,
  html,
  CSSResultGroup,
  TemplateResult,
  nothing,
  PropertyValues,
} from "lit";
import {
  ActionConfig,
  ActionHandlerEvent,
  handleAction,
  hasAction,
  hasConfigOrEntityChanged,
} from "custom-card-helpers";
import {
  ForecastEvent,
  getForecast,
  subscribeForecast,
  supportsRequiredForecastFeatures,
  WeatherEntity,
  ForecastType,
  WeatherUnits,
  ForecastAttribute,
  aggregateHourlyForecastData,
} from "./data/weather";
import {
  ExtendedHomeAssistant,
  ForecastSubscription,
  WeatherForecastCardConfig,
} from "./types";

import "./components/wfc-forecast-chart";
import "./components/wfc-forecast-simple";
import "./components/wfc-current-weather";

const DEFAULT_CONFIG: Partial<WeatherForecastCardConfig> = {
  type: "custom:weather-forecast-card",
  show_current: true,
  show_forecast: true,
  default_forecast: "daily",
  forecast: {
    mode: ForecastMode.Simple,
    show_sun_times: true,
  },
  forecast_action: {
    tap_action: { action: "toggle-forecast" },
  },
  tap_action: { action: "more-info" },
};

export class WeatherForecastCard extends LitElement {
  @property({ attribute: false }) public hass?: ExtendedHomeAssistant;
  @state() private config?: WeatherForecastCardConfig;
  @state() private _dailySubscription?: ForecastSubscription;
  @state() private _hourlySubscription?: ForecastSubscription;
  @state() private _dailyForecastEvent?: ForecastEvent | undefined;
  @state() private _hourlyForecastEvent?: ForecastEvent | undefined;
  @state() private _currentItemWidth!: number;
  @state() private _currentForecastType: ForecastType = "daily";

  private _hourlyForecastData?: ForecastAttribute[];
  private _dailyForecastData?: ForecastAttribute[];

  private _minForecastItemWidth?: number;
  private _forecastContainer?: HTMLElement | null = null;
  private _resizeObserver?: ResizeObserver | null = null;

  static styles = styles as CSSResultGroup;

  public static async getConfigElement() {
    return document.createElement("weather-forecast-card-editor");
  }

  public static getStubConfig(
    hass: ExtendedHomeAssistant
  ): Partial<WeatherForecastCardConfig> {
    const weatherEntities = Object.keys(hass?.states ?? {}).filter((entityId) =>
      entityId.startsWith("weather.")
    );

    const defaultEntity =
      weatherEntities.find((entityId) => entityId === "weather.home") ||
      weatherEntities[0] ||
      "";

    return {
      ...DEFAULT_CONFIG,
      entity: defaultEntity,
    };
  }

  public setConfig(config: WeatherForecastCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("entity is required");
    }

    if (config.show_current === false && config.show_forecast === false) {
      throw new Error(
        "At least one of show_current or show_forecast must be true"
      );
    }

    this.config = merge({}, DEFAULT_CONFIG, config);
    this._currentForecastType = this.config.default_forecast || "daily";
  }

  public connectedCallback(): void {
    super.connectedCallback();

    this._minForecastItemWidth = this.getInitialMinForecastItemWidth();
    this.waitForLayout();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    this.unsubscribeForecastEvents();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    // Make sure the component indicates no visibility when disconnected
    // This impacts the layout calculations when re-connected to the DOM.
    this._currentItemWidth = 0;
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    return (
      hasConfigOrEntityChanged(this, changedProperties, false) ||
      changedProperties.has("_dailyForecastEvent") ||
      changedProperties.has("_hourlyForecastEvent") ||
      changedProperties.has("_currentForecastType") ||
      changedProperties.has("_currentItemWidth")
    );
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!this.config || !this.hass) {
      return;
    }

    if (
      changedProps.has("config") ||
      this.haveWeatherUnitsChanged(changedProps) ||
      (!this._hourlySubscription && !this._dailySubscription)
    ) {
      this.subscribeForecastEvents();
    }

    // Depending on which forecast is shown, layout has to be recalculated if for example
    // the gap or item width changes when there are fewer items on the container.
    if (changedProps.has("_currentForecastType")) {
      if (this._forecastContainer) {
        this.layoutForecastItems(this._forecastContainer.clientWidth);
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config || !this.hass) {
      return nothing;
    }

    const entity = this.config.entity;
    const stateObject = this.hass.states[entity] as WeatherEntity;

    if (!stateObject) {
      return html`<hui-warning>
        ${createWarningText(this.hass, entity)}
      </hui-warning>`;
    }

    const isChartMode = this.config.forecast?.mode === ForecastMode.Chart;
    const currentForecast =
      (this._currentForecastType === "hourly"
        ? this._hourlyForecastData
        : this._dailyForecastData) || [];

    return html`
      <ha-card>
        <div class="wfc-container">
          ${this.config.show_current
            ? html`<div
                class="wfc-current-weather-container"
                .actionHandler=${actionHandler({
                  hasHold: hasAction(this.config.hold_action as ActionConfig),
                  hasDoubleClick: hasAction(
                    this.config.double_tap_action as ActionConfig
                  ),
                })}
                @action=${this.onCardAction}
              >
                <wfc-current-weather
                  .hass=${this.hass}
                  .weatherEntity=${stateObject}
                  .config=${this.config}
                  .dailyForecast=${this._dailyForecastData}
                ></wfc-current-weather>
              </div>`
            : nothing}
          ${this.config.show_forecast === false
            ? nothing
            : html`<div
                class="wfc-forecast-container"
                .actionHandler=${actionHandler({
                  hasHold: hasAction(
                    this.config.forecast_action?.hold_action as ActionConfig
                  ),
                  hasDoubleClick: hasAction(
                    this.config.forecast_action
                      ?.double_tap_action as ActionConfig
                  ),
                })}
                @action=${this.onForecastAction}
              >
                ${isChartMode
                  ? html`
                      <wfc-forecast-chart
                        .hass=${this.hass}
                        .config=${this.config}
                        .weatherEntity=${stateObject}
                        .forecast=${currentForecast}
                        .forecastType=${this._currentForecastType}
                        .itemWidth=${this._currentItemWidth}
                      ></wfc-forecast-chart>
                    `
                  : html`
                      <wfc-forecast-simple
                        .hass=${this.hass}
                        .config=${this.config}
                        .weatherEntity=${stateObject}
                        .forecast=${currentForecast}
                        .forecastType=${this._currentForecastType}
                      ></wfc-forecast-simple>
                    `}
              </div>`}
        </div>
      </ha-card>
    `;
  }

  private waitForLayout(): void {
    if (!this.isConnected) return;

    if (!this._forecastContainer) {
      this._forecastContainer = this.renderRoot?.querySelector(
        ".wfc-forecast-container"
      );
    }

    const width = this._forecastContainer?.clientWidth || 0;

    // We may need to wait for the container to have width (e.g. popup open animation)
    // before we can initialize the ResizeObserver.
    if (width > 0) {
      this.initResizeObserver();
    } else {
      requestAnimationFrame(() => this.waitForLayout());
    }
  }

  private initResizeObserver() {
    if (this._resizeObserver || !this._forecastContainer) return;

    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          this.layoutForecastItems(entry.contentRect.width);
        }
      }
    });

    this._resizeObserver.observe(this._forecastContainer);

    // Force immediate layout now that we know we have width
    this.layoutForecastItems(this._forecastContainer.clientWidth);
  }

  private getInitialMinForecastItemWidth(): number {
    const computedStyle = getComputedStyle(this);
    const itemWidth = computedStyle
      .getPropertyValue("--forecast-item-width")
      .trim();

    return parseInt(itemWidth || "60", 10);
  }

  private processForecastData() {
    if (!this._dailyForecastEvent && !this._hourlyForecastEvent) {
      return;
    }

    const { attributes } = this.hass!.states[
      this.config!.entity
    ] as WeatherEntity;

    if (!attributes) {
      return;
    }

    const hourlyForecastData = getForecast(
      attributes,
      this._hourlyForecastEvent,
      "hourly"
    );
    const dailyForecastData = getForecast(
      attributes,
      this._dailyForecastEvent,
      "daily"
    );

    if (!hourlyForecastData && !dailyForecastData) {
      return;
    }

    this._dailyForecastData = dailyForecastData?.forecast;
    const hourlyGroupSize = this.config?.forecast?.hourly_group_size || 0;

    if (hourlyGroupSize > 1 && hourlyForecastData?.forecast) {
      this._hourlyForecastData = aggregateHourlyForecastData(
        hourlyForecastData.forecast,
        hourlyGroupSize
      );
    } else {
      this._hourlyForecastData = hourlyForecastData?.forecast;
    }
  }

  private _toggleForecastView() {
    this._currentForecastType =
      this._currentForecastType === "daily" ? "hourly" : "daily";
  }

  private unsubscribeForecastEvents() {
    logger.debug("Unsubscribing from forecast events");

    this._dailySubscription?.then((unsub) => unsub());
    this._hourlySubscription?.then((unsub) => unsub());
  }

  private async subscribeForecastEvents() {
    this.unsubscribeForecastEvents();

    if (
      !this.isConnected ||
      !this.hass ||
      !this.config ||
      !this.hass.config.components.includes("weather") ||
      !this.hass.states[this.config!.entity]
    ) {
      return;
    }

    if (
      !supportsRequiredForecastFeatures(this.hass.states[this.config.entity])
    ) {
      logger.warn("Weather entity does not support all forecast features.");
      return;
    }

    logger.debug("Subscribing to forecast events");

    try {
      this._dailySubscription = Promise.resolve(
        subscribeForecast(this.hass!, this.config!.entity, "daily", (event) => {
          this._dailyForecastEvent = event;
          this.processForecastData();
        })
      );
    } catch (error: any) {
      if (error.code === "invalid_entity_id") {
        setTimeout(() => {
          this._dailyForecastEvent = undefined;
        }, 2000);
      }
      throw error;
    }

    try {
      this._hourlySubscription = Promise.resolve(
        subscribeForecast(
          this.hass!,
          this.config!.entity,
          "hourly",
          (event) => {
            this._hourlyForecastEvent = event;
            this.processForecastData();
          }
        )
      );
    } catch (error: any) {
      if (error.code === "invalid_entity_id") {
        setTimeout(() => {
          this._hourlyForecastEvent = undefined;
        }, 2000);
      }
      throw error;
    }
  }

  private layoutForecastItems(containerWidth: number) {
    if (containerWidth <= 0 || !this._minForecastItemWidth) return;

    const items =
      (this._currentForecastType === "hourly"
        ? this._hourlyForecastEvent?.forecast
        : this._dailyForecastEvent?.forecast) || [];

    if (!items.length) return;

    const itemsPerView = Math.max(
      1,
      Math.floor(containerWidth / this._minForecastItemWidth)
    );

    const calculatedItemWidth = Math.floor(containerWidth / itemsPerView);

    const n = items.length;
    const totalItemsWidth = n * calculatedItemWidth;
    const freeSpace = containerWidth - totalItemsWidth;
    const gap = freeSpace > 0 ? freeSpace / (n - 1) : 0;

    this._currentItemWidth = calculatedItemWidth + gap;

    this.style.setProperty("--forecast-item-gap", `${gap}px`);
    this.style.setProperty("--forecast-item-width", `${calculatedItemWidth}px`);
  }

  private haveWeatherUnitsChanged(changedProps: PropertyValues): boolean {
    if (!changedProps.has("hass") || !this.config?.entity) {
      return false;
    }

    const oldHass = changedProps.get("hass") as ExtendedHomeAssistant;
    const newHass = this.hass;

    if (!oldHass || !newHass) {
      return false;
    }

    const oldState = oldHass.states[this.config.entity];
    const newState = newHass.states[this.config.entity];

    if (!oldState || !newState) {
      return false;
    }

    return Object.values(WeatherUnits).some((unitKey) => {
      return oldState.attributes[unitKey] !== newState.attributes[unitKey];
    });
  }

  private onForecastAction = (event: ActionHandlerEvent): void => {
    if (!this.config) {
      return;
    }

    const action = event.detail.action;

    if (
      (action === "tap" &&
        this.config.forecast_action?.tap_action?.action ===
          "toggle-forecast") ||
      (action === "hold" &&
        this.config.forecast_action?.hold_action?.action ===
          "toggle-forecast") ||
      (action === "double_tap" &&
        this.config.forecast_action?.double_tap_action?.action ===
          "toggle-forecast")
    ) {
      this._toggleForecastView();
    } else {
      handleAction(
        this,
        this.hass!,
        {
          entity: this.config.entity,
          tap_action: this.config.forecast_action?.tap_action as ActionConfig,
          hold_action: this.config.forecast_action?.hold_action as ActionConfig,
          double_tap_action: this.config.forecast_action
            ?.double_tap_action as ActionConfig,
        },
        event.detail.action
      );
    }
  };

  private onCardAction = (event: ActionHandlerEvent): void => {
    handleAction(this, this.hass!, this.config!, event.detail.action);
  };
}
