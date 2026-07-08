import { merge } from "lodash-es";
import { property, query, state } from "lit/decorators.js";
import { styles } from "./weather-forecast-card.styles";
import {
  createWarningText,
  getReferencedCurrentEntities,
  normalizeDate,
} from "./helpers";
import { logger } from "./logger";
import {
  actionHandler,
  isInvalidEntityIdError,
  isSubscriptionNotFoundError,
  LovelaceGridOptions,
} from "./hass";
import {
  ForecastActionEvent,
  ForecastMode,
  MAX_TEMPERATURE_PRECISION,
} from "./types";
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
  getDailyForecastType,
  subscribeForecast,
  supportsForecastType,
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
  ForecastTypesOption,
  WeatherForecastCardConfig,
} from "./types";

import "./components/wfc-forecast-chart";
import "./components/wfc-forecast-simple";
import "./components/wfc-current-weather";
import "./components/animation/wfc-animation-provider";

const DEFAULT_CONFIG: Partial<WeatherForecastCardConfig> = {
  type: "custom:weather-forecast-card",
  show_current: true,
  show_forecast: true,
  default_forecast: "daily",
  forecast_types: "both",
  forecast: {
    mode: ForecastMode.Simple,
    show_sun_times: true,
    use_color_thresholds: true,
    scroll_to_selected: true,
  },
  forecast_action: {
    tap_action: { action: "toggle-forecast" },
    hold_action: { action: "select-forecast-attribute" },
  },
  tap_action: { action: "more-info" },
};

const DISCONNECT_UNSUBSCRIBE_DELAY_MS = 1000;

export class WeatherForecastCard extends LitElement {
  @property({ attribute: false }) public hass?: ExtendedHomeAssistant;
  @state() private config?: WeatherForecastCardConfig;
  @state() private _dailyForecastEvent?: ForecastEvent | undefined;
  @state() private _hourlyForecastEvent?: ForecastEvent | undefined;
  @state() private _currentItemWidth!: number;
  @state() private _currentForecastType: ForecastType = "daily";
  @state() private _isScrollable = false;
  @query("ha-card") private _haCard?: HTMLElement;
  @query(".wfc-forecast-container") private _forecastContainer?: HTMLElement;

  private _dailySubscription?: ForecastSubscription;
  private _hourlySubscription?: ForecastSubscription;
  private _subscriptionRequestId = 0;
  private _subscriptionGeneration = 0;
  private _subscribed = false;
  private _disconnectUnsubscribeTimer?: number;

  private _hourlyForecastData?: ForecastAttribute[];
  private _dailyForecastData?: ForecastAttribute[];

  private _minForecastItemWidth?: number;
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

    if (
      config.forecast?.daily_slots != null &&
      config.forecast.daily_slots <= 0
    ) {
      throw new Error("daily_slots must be greater than 0");
    }

    if (
      config.forecast?.hourly_slots != null &&
      config.forecast.hourly_slots <= 0
    ) {
      throw new Error("hourly_slots must be greater than 0");
    }

    if (
      (config.current?.temperature_precision != null &&
        (config.current.temperature_precision < 0 ||
          config.current.temperature_precision > MAX_TEMPERATURE_PRECISION)) ||
      (config.forecast?.temperature_precision != null &&
        (config.forecast.temperature_precision < 0 ||
          config.forecast.temperature_precision > MAX_TEMPERATURE_PRECISION))
    ) {
      throw new Error(
        `temperature_precision must be 0 or greater and at most ${MAX_TEMPERATURE_PRECISION}`
      );
    }

    // Migrate legacy root-level temperature_entity to current.temperature_entity
    // Prefer current.temperature_entity if both are defined
    const migratedConfig = { ...config };
    if (config.temperature_entity) {
      if (!config.current?.temperature_entity) {
        migratedConfig.current = {
          ...config.current,
          temperature_entity: config.temperature_entity,
        };
      }
      delete migratedConfig.temperature_entity;
    }

    this.config = merge({}, DEFAULT_CONFIG, migratedConfig);
    this._currentForecastType = this.config.default_forecast || "daily";
  }

  /**
   * Reports sizing to Home Assistant's Sections view so the card snaps to whole
   * grid rows instead of taking an arbitrary fractional height.
   *
   * Row counts are derived from the enabled blocks; the content is vertically
   * centered (see CSS) when the user sizes the card taller than it needs, so a
   * slightly generous estimate only adds whitespace rather than clipping.
   */
  public getGridOptions(): LovelaceGridOptions {
    const { rows, minRows, minColumns } = this.computeRowSizing();

    return {
      columns: 12,
      rows,
      min_rows: minRows,
      min_columns: minColumns,
    };
  }

  /**
   * Reports sizing for the legacy masonry view (units of ~50px). Reuses the same
   * block accounting as {@link getGridOptions}.
   */
  public getCardSize(): number {
    return this.computeRowSizing().rows;
  }

  /**
   * Derives the card's grid sizing from the enabled blocks (current weather and
   * the simple/chart forecast). Pure function of the config with no `hass`/DOM
   * dependency, so it is safe to call before the first render.
   */
  private computeRowSizing(): {
    rows: number;
    minRows: number;
    minColumns: number;
  } {
    const showCurrent = this.config?.show_current !== false;
    const showForecast = this.config?.show_forecast !== false;
    const isChart = this.config?.forecast?.mode === ForecastMode.Chart;

    // Base allowance for card padding and the gap between blocks.
    let rows = 1;
    let minRows = 1;

    if (showCurrent) {
      // Conditions icon + name + temperature.
      rows += 2;
      minRows += 2;

      // The optional attribute list adds a variable amount of height; reserve a
      // little extra so the default size does not clip a typical attribute list.
      if (this.config?.current?.show_attributes) {
        rows += 1;
      }
    }

    if (showForecast) {
      if (isChart) {
        // Optional settings bar + 130px chart + header/footer labels.
        rows += 3;
        minRows += 3;
      } else {
        // Simple forecast column (time + icon + temperature + precipitation).
        rows += 2;
        minRows += 2;
      }
    }

    return {
      rows,
      minRows,
      minColumns: showCurrent && showForecast ? 6 : 4,
    };
  }

  public connectedCallback(): void {
    super.connectedCallback();

    this.clearDisconnectUnsubscribeTimer();

    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this._minForecastItemWidth = this.computeInitialMinForecastItemWidth();
    this.waitForLayout();

    if (
      this.hasUpdated &&
      this.config &&
      this.hass &&
      !this._subscribed &&
      !document.hidden
    ) {
      this.subscribeForecastEvents();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    // Keep the visibility listener attached through the disconnect grace window:
    // if the page is hidden (e.g. screen off) while a detached card is awaiting
    // its delayed unsubscribe, the throttled timer would not fire in time and HA
    // would keep queueing broadcasts. The listener lets us tear down
    // synchronously instead, and is removed once the teardown completes.
    this.scheduleDisconnectUnsubscribe();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    // Make sure the component indicates no visibility when disconnected
    // This impacts the layout calculations when re-connected to the DOM.
    this._currentItemWidth = 0;
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    return (
      hasConfigOrEntityChanged(this, changedProperties, false) ||
      this.hasReferencedCurrentEntityChanged(changedProperties) ||
      changedProperties.has("_dailyForecastEvent") ||
      changedProperties.has("_hourlyForecastEvent") ||
      changedProperties.has("_currentForecastType") ||
      changedProperties.has("_currentItemWidth") ||
      changedProperties.has("_isScrollable")
    );
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!this.config || !this.hass) {
      return;
    }

    if (!this.isConnected) {
      return;
    }

    if (this.haveForecastSubscriptionInputsChanged(changedProps)) {
      this._subscribed = false;
    }

    // Skip while the page is hidden: a hass update arriving in a backgrounded
    // tab must not re-open subscriptions we deliberately suspended.
    if (!this._subscribed && !document.hidden) {
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

    const isTwiceDailyEntity =
      getDailyForecastType(stateObject) === "twice_daily";
    const isChartMode = this.config.forecast?.mode === ForecastMode.Chart;
    const currentForecast = this.getCurrentForecast();

    return html`
      <ha-card>
        ${this.config.show_condition_effects
          ? html`<wfc-animation-provider
              .hass=${this.hass}
              .weatherEntity=${stateObject}
              .config=${this.config}
              .currentForecast=${this._hourlyForecastData?.[0]}
            ></wfc-animation-provider>`
          : nothing}
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
                  .hourlyForecast=${this._hourlyForecastData}
                  .dailyForecast=${this._dailyForecastData}
                ></wfc-current-weather>
              </div>`
            : nothing}
          ${this.config.show_forecast === false
            ? nothing
            : html`<div class="wfc-forecast-container">
                ${isChartMode
                  ? html`<wfc-forecast-chart
                      @action=${this.onForecastAction}
                      .hass=${this.hass}
                      .config=${this.config}
                      .weatherEntity=${stateObject}
                      .forecast=${currentForecast}
                      .forecastType=${this._currentForecastType}
                      .isTwiceDailyEntity=${isTwiceDailyEntity}
                      .itemWidth=${this._currentItemWidth}
                      .isScrollable=${this._isScrollable}
                    ></wfc-forecast-chart>`
                  : html`<wfc-forecast-simple
                      @action=${this.onForecastAction}
                      .hass=${this.hass}
                      .config=${this.config}
                      .weatherEntity=${stateObject}
                      .forecast=${currentForecast}
                      .forecastType=${this._currentForecastType}
                      .isTwiceDailyEntity=${isTwiceDailyEntity}
                      .isScrollable=${this._isScrollable}
                    ></wfc-forecast-simple>`}
              </div>`}
        </div>
      </ha-card>
    `;
  }

  private waitForLayout(): void {
    if (!this.isConnected) return;

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

  private computeInitialMinForecastItemWidth(): number {
    const style = getComputedStyle(this);
    const minItemWidthSimple =
      parseInt(style.getPropertyValue("--wfc-min-item-width-simple")) || 65;
    const minItemWidthChart =
      parseInt(style.getPropertyValue("--wfc-min-item-width-chart")) || 55;

    return this.config?.forecast?.mode === ForecastMode.Simple
      ? minItemWidthSimple
      : minItemWidthChart;
  }

  private processForecastData() {
    if (!this._dailyForecastEvent && !this._hourlyForecastEvent) {
      return;
    }

    const weatherEntity = this.hass!.states[
      this.config!.entity
    ] as WeatherEntity;
    const { attributes } = weatherEntity;

    if (!attributes) {
      return;
    }

    const oldHourlyLength = this._hourlyForecastData?.length;
    const oldDailyLength = this._dailyForecastData?.length;

    const hourlyForecastData = getForecast(
      attributes,
      this._hourlyForecastEvent,
      "hourly"
    );
    // Use the effective daily type (daily or twice_daily) for processing
    const dailyForecastData = getForecast(
      attributes,
      this._dailyForecastEvent,
      getDailyForecastType(weatherEntity)
    );

    if (!hourlyForecastData && !dailyForecastData) {
      return;
    }

    this._dailyForecastData = dailyForecastData?.forecast;

    if (this._dailyForecastData && this.config?.forecast?.daily_slots != null) {
      this._dailyForecastData = this._dailyForecastData.slice(
        0,
        this.config.forecast.daily_slots
      );
    }

    const hourlyGroupSize = this.config?.forecast?.hourly_group_size || 0;

    if (hourlyGroupSize > 1 && hourlyForecastData?.forecast) {
      this._hourlyForecastData = aggregateHourlyForecastData(
        hourlyForecastData.forecast,
        hourlyGroupSize
      );
    } else {
      this._hourlyForecastData = hourlyForecastData?.forecast;
    }

    if (
      this._hourlyForecastData &&
      this.config?.forecast?.hourly_slots != null
    ) {
      this._hourlyForecastData = this._hourlyForecastData.slice(
        0,
        this.config.forecast.hourly_slots
      );
    }

    // Auto-switch to available forecast type if current type has no data
    // BUT only if we've received both forecast events (to avoid switching
    // prematurely when one forecast is just loading slower than the other)
    const currentForecastData = this.getCurrentForecast();
    if (!currentForecastData || currentForecastData.length === 0) {
      const hasBothEvents =
        this._dailyForecastEvent != null && this._hourlyForecastEvent != null;

      // Check if entity supports any daily-like forecast (daily or twice_daily)
      const effectiveDailyType = getDailyForecastType(weatherEntity);
      const hasDailyLike = effectiveDailyType !== undefined;
      const isInDailyLikeView =
        this._currentForecastType === "daily" ||
        this._currentForecastType === "twice_daily";
      const shouldAutoSwitch =
        hasBothEvents ||
        (this._currentForecastType === "hourly" &&
          !supportsForecastType(weatherEntity, "hourly")) ||
        (isInDailyLikeView && !hasDailyLike);

      if (shouldAutoSwitch) {
        if (this._currentForecastType === "hourly" && this._dailyForecastData) {
          logger.debug(
            "No hourly forecast data available, switching to daily forecast"
          );

          this._currentForecastType = effectiveDailyType || "daily";
        } else if (isInDailyLikeView && this._hourlyForecastData) {
          logger.debug(
            "No daily forecast data available, switching to hourly forecast"
          );

          this._currentForecastType = "hourly";
        }
      }
    }

    // Recalculate layout if the number of items changed
    const newLength = this.getCurrentForecast().length;

    const oldLength =
      (this._currentForecastType === "hourly"
        ? oldHourlyLength
        : oldDailyLength) ?? 0;

    if (newLength !== oldLength && this._forecastContainer) {
      this.layoutForecastItems(this._forecastContainer.clientWidth);
    }
  }

  private _toggleForecastView(selectedForecast?: ForecastAttribute) {
    const isInDailyLikeView =
      this._currentForecastType === "daily" ||
      this._currentForecastType === "twice_daily";
    const willSwitchToHourly = isInDailyLikeView;
    const targetForecastData = willSwitchToHourly
      ? this._hourlyForecastData
      : this._dailyForecastData;

    // Toggle between hourly and the effective daily type (daily or twice_daily)
    const weatherEntity = this.hass?.states[this.config!.entity];
    const effectiveDailyType = getDailyForecastType(weatherEntity) || "daily";

    // Don't toggle if the target forecast type has no data
    if (!targetForecastData || targetForecastData.length === 0) {
      logger.debug(
        `Cannot toggle to ${willSwitchToHourly ? "hourly" : effectiveDailyType} forecast - no data available`
      );
      return;
    }

    this._currentForecastType = isInDailyLikeView
      ? "hourly"
      : effectiveDailyType;

    if (!selectedForecast || !this.config?.forecast?.scroll_to_selected) {
      return;
    }

    requestAnimationFrame(() => {
      if (willSwitchToHourly) {
        this.scrollToForecastItem(selectedForecast);
      } else {
        const firstDaily = this._dailyForecastData?.[0];

        if (firstDaily) {
          this.scrollToForecastItem(firstDaily, "instant");
        }
      }
    });
  }

  private scrollToForecastItem(
    selectedForecast: ForecastAttribute,
    behavior: ScrollBehavior = "smooth"
  ) {
    if (!this._forecastContainer) return;

    const scrollContainer = this._forecastContainer.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement;

    if (!scrollContainer) return;

    const normalizedSelectedDate = normalizeDate(selectedForecast.datetime);
    const currentForecast = this.getCurrentForecast();

    const index = currentForecast.findIndex((item) => {
      return normalizeDate(item.datetime) === normalizedSelectedDate;
    });

    const finalIndex = index !== -1 ? index : currentForecast.length - 1;
    const itemWidth = this._currentItemWidth || 0;
    const leftPosition = finalIndex * itemWidth;

    scrollContainer.scrollTo({
      left: leftPosition,
      behavior,
    });
  }

  private async unsubscribeForecastEvents() {
    this.clearDisconnectUnsubscribeTimer();
    this._subscriptionGeneration += 1;

    const dailySubscription = this._dailySubscription;
    const hourlySubscription = this._hourlySubscription;

    this._subscribed = false;

    // Clear subscription references before awaiting so a newer generation cannot
    // accidentally unsubscribe handles already being retired by this generation.
    this._dailySubscription = undefined;
    this._hourlySubscription = undefined;

    // Once we have fully torn down while detached, stop listening for visibility
    // changes so a discarded card is not retained by the document-level listener.
    // While still connected the listener stays so suspend/resume keeps working.
    if (!this.isConnected) {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }

    await Promise.all([
      this.unsubscribeForecastSubscription(dailySubscription, "daily"),
      this.unsubscribeForecastSubscription(hourlySubscription, "hourly"),
    ]);
  }

  private scheduleDisconnectUnsubscribe(): void {
    this.clearDisconnectUnsubscribeTimer();

    this._disconnectUnsubscribeTimer = window.setTimeout(() => {
      this._disconnectUnsubscribeTimer = undefined;
      this._subscriptionRequestId += 1;
      void this.unsubscribeForecastEvents();
    }, DISCONNECT_UNSUBSCRIBE_DELAY_MS);
  }

  private clearDisconnectUnsubscribeTimer(): void {
    if (this._disconnectUnsubscribeTimer === undefined) {
      return;
    }

    window.clearTimeout(this._disconnectUnsubscribeTimer);
    this._disconnectUnsubscribeTimer = undefined;
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.suspendForecastSubscriptions();
    } else {
      this.resumeForecastSubscriptions();
    }
  };

  private suspendForecastSubscriptions(): void {
    if (!this._subscribed && this._disconnectUnsubscribeTimer === undefined) {
      return;
    }

    // The page is hidden (e.g. tablet screen off or kiosk webview backgrounded).
    // Background timers are throttled, so unsubscribe synchronously instead of
    // via the disconnect timer to make sure the unsubscribe reaches Home
    // Assistant before the page freezes. Otherwise HA keeps queueing the full
    // forecast broadcasts we cannot drain, eventually overflowing its message
    // queue and dropping the client (issue #129).
    this._subscriptionRequestId += 1;
    void this.unsubscribeForecastEvents();
  }

  private resumeForecastSubscriptions(): void {
    if (this.isConnected && this.config && this.hass && !this._subscribed) {
      this.subscribeForecastEvents();
    }
  }

  private async unsubscribeForecastSubscription(
    subscription: ForecastSubscription,
    type: ForecastType
  ): Promise<void> {
    if (!subscription) {
      return;
    }

    try {
      const unsub = await subscription;
      if (!unsub) {
        return;
      }
      await unsub();
    } catch (error) {
      if (isSubscriptionNotFoundError(error)) {
        return;
      }

      logger.warn(`Error unsubscribing from ${type} forecast:`, error);
    }
  }

  private createForecastSubscription(
    forecastType: ForecastEvent["type"],
    callback: (event: ForecastEvent) => void,
    onInvalidEntityId: () => void
  ): ForecastSubscription {
    return Promise.resolve(
      subscribeForecast(this.hass!, this.config!.entity, forecastType, callback)
    ).catch((error: unknown) => {
      if (isInvalidEntityIdError(error)) {
        setTimeout(onInvalidEntityId, 2000);
        return undefined;
      }

      if (isSubscriptionNotFoundError(error)) {
        return undefined;
      }

      logger.warn(`Error subscribing to ${forecastType} forecast:`, error);
      return undefined;
    });
  }

  private async subscribeForecastEvents() {
    const subscriptionRequestId = ++this._subscriptionRequestId;

    await this.unsubscribeForecastEvents();

    if (subscriptionRequestId !== this._subscriptionRequestId) {
      return;
    }

    const subscriptionGeneration = this._subscriptionGeneration;

    if (
      !this.isConnected ||
      !this.hass ||
      !this.config ||
      !this.hass.config.components.includes("weather") ||
      !this.hass.states[this.config!.entity]
    ) {
      return;
    }

    if (this.config.show_forecast === false) {
      return;
    }

    if (
      !supportsRequiredForecastFeatures(this.hass.states[this.config.entity])
    ) {
      logger.warn(
        "Weather entity does not support forecast. Cannot display forecast data."
      );
      return;
    }

    this._subscribed = true;

    const weatherEntity = this.hass.states[this.config.entity];

    // Limit which forecast types we subscribe to. Each subscription makes HA
    // re-broadcast its full forecast array on every weather state change, so
    // skipping an unused type avoids needless websocket load (issue #129).
    const forecastTypes: ForecastTypesOption =
      this.config.forecast_types ?? "both";
    const subscribeDaily = forecastTypes !== "hourly";
    const subscribeHourly = forecastTypes !== "daily";

    // Subscribe to the effective daily type (daily preferred, twice_daily as fallback)
    const effectiveDailyType = getDailyForecastType(weatherEntity);

    // Update current forecast type if we're in daily view but entity only supports twice_daily
    if (
      effectiveDailyType === "twice_daily" &&
      this._currentForecastType === "daily"
    ) {
      this._currentForecastType = "twice_daily";
    }

    // Keep the visible forecast type aligned with the subscribed types so the
    // card never starts on a view that will never receive data.
    if (!subscribeDaily && this._currentForecastType !== "hourly") {
      this._currentForecastType = "hourly";
    } else if (!subscribeHourly && this._currentForecastType === "hourly") {
      this._currentForecastType = effectiveDailyType || "daily";
    }

    if (effectiveDailyType && subscribeDaily) {
      this._dailySubscription = this.createForecastSubscription(
        effectiveDailyType,
        (event) => {
          if (!this.shouldHandleForecastEvent(subscriptionGeneration)) {
            return;
          }

          this._dailyForecastEvent = event;
          this.processForecastData();
        },
        () => {
          this._dailyForecastEvent = undefined;
        }
      );
    }

    if (subscribeHourly && supportsForecastType(weatherEntity, "hourly")) {
      this._hourlySubscription = this.createForecastSubscription(
        "hourly",
        (event) => {
          if (!this.shouldHandleForecastEvent(subscriptionGeneration)) {
            return;
          }

          this._hourlyForecastEvent = event;
          this.processForecastData();
        },
        () => {
          this._hourlyForecastEvent = undefined;
        }
      );
    }
  }

  private getCurrentForecast(): ForecastAttribute[] {
    return (
      (this._currentForecastType === "hourly"
        ? this._hourlyForecastData
        : this._dailyForecastData) || []
    );
  }

  private layoutForecastItems(containerWidth: number) {
    if (containerWidth <= 0 || !this._minForecastItemWidth || !this._haCard) {
      return;
    }

    const items = this.getCurrentForecast();

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
    this._isScrollable = items.length > itemsPerView;

    this._haCard.style.setProperty("--forecast-item-gap", `${gap}px`);
    this._haCard.style.setProperty(
      "--forecast-item-width",
      `${calculatedItemWidth}px`
    );
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

  private haveForecastSubscriptionInputsChanged(
    changedProps: PropertyValues
  ): boolean {
    return (
      changedProps.has("config") ||
      this.haveWeatherUnitsChanged(changedProps) ||
      this.haveForecastFeaturesChanged(changedProps) ||
      this.hasWeatherEntityAvailabilityChanged(changedProps) ||
      this.hasConnectionBeenReestablished(changedProps)
    );
  }

  private hasConnectionBeenReestablished(
    changedProps: PropertyValues
  ): boolean {
    if (!changedProps.has("hass")) {
      return false;
    }

    const oldHass = changedProps.get("hass") as
      | ExtendedHomeAssistant
      | undefined;
    const newHass = this.hass;

    // With resubscribe:false the websocket reconnect drops our subscriptions, so
    // detect the connection coming back (connected false -> true) and force a
    // resubscribe. Otherwise forecasts silently stop updating until the next
    // config change or visibility toggle.
    return oldHass?.connected === false && newHass?.connected === true;
  }

  private shouldHandleForecastEvent(subscriptionGeneration: number): boolean {
    // Capture data from the current, live subscription regardless of whether the
    // element is momentarily detached from the DOM. Lovelace/Bubble Card popups
    // reparent the card while opening, and a forecast event delivered during that
    // gap must not be lost — otherwise the forecast never renders and only the
    // current-weather section (which reads entity state directly) shows. Events
    // from retired subscriptions are still dropped via the generation guard, and
    // a torn-down card via the _subscribed flag.
    return (
      this._subscribed &&
      subscriptionGeneration === this._subscriptionGeneration
    );
  }

  private haveForecastFeaturesChanged(changedProps: PropertyValues): boolean {
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

    return (
      oldState.attributes.supported_features !==
      newState.attributes.supported_features
    );
  }

  private hasWeatherEntityAvailabilityChanged(
    changedProps: PropertyValues
  ): boolean {
    if (!changedProps.has("hass") || !this.config?.entity) {
      return false;
    }

    const oldHass = changedProps.get("hass") as ExtendedHomeAssistant;
    const newHass = this.hass;

    if (!newHass) {
      return false;
    }

    const oldEntityState = oldHass?.states[this.config.entity];
    const newEntityState = newHass.states[this.config.entity];

    return !!oldEntityState !== !!newEntityState;
  }

  private hasReferencedCurrentEntityChanged(
    changedProps: PropertyValues
  ): boolean {
    if (!changedProps.has("hass") || !this.config) {
      return false;
    }

    const oldHass = changedProps.get("hass") as
      | ExtendedHomeAssistant
      | undefined;
    const newHass = this.hass;

    if (!oldHass || !newHass) {
      return false;
    }

    // hasConfigOrEntityChanged only tracks the primary weather entity, but the
    // current section can also read custom sensors (temperature_entity,
    // secondary info, show_attributes). React when any of those change too.
    return getReferencedCurrentEntities(this.config).some(
      (entityId) => oldHass.states[entityId] !== newHass.states[entityId]
    );
  }

  private onForecastAction = (event: ForecastActionEvent): void => {
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
      this._toggleForecastView(event.detail.selectedForecast ?? undefined);
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
