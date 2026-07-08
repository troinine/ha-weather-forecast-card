import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { actionHandler } from "../hass";
import { getSuntimesInfo, normalizeDate } from "../helpers";
import {
  ActionConfig,
  ActionHandlerEvent,
  handleAction,
  hasAction,
} from "custom-card-helpers";
import { HassEntity } from "home-assistant-js-websocket";
import {
  CURRENT_WEATHER_ATTRIBUTES,
  CurrentWeatherAttributes,
  CurrentWeatherAttributeConfig,
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../types";
import {
  ForecastAttribute,
  formatCustomEntityAttributeValue,
  formatTemperature,
  formatWeatherEntityAttributeValue,
  WEATHER_ATTRIBUTE_ICON_MAP,
  WeatherEntity,
} from "../data/weather";

import "./wfc-weather-condition-icon-provider";
import "./wfc-current-weather-attributes";

export type NormalizedAttributeConfig = {
  name?: CurrentWeatherAttributes | string;
  entity?: string;
  label?: string;
  icon?: string;
};

type SecondaryInfo = {
  icon?: string;
  stateObj?: HassEntity;
  value?: string;
};

type TemperatureExtrema = {
  high?: string;
  low?: string;
};

type ExtendedCurrentWeatherAttribute =
  | (typeof CURRENT_WEATHER_ATTRIBUTES)[number]
  | "precipitation";

const EXTENDED_WEATHER_ATTRIBUTE_ICON_MAP: {
  [key in ExtendedCurrentWeatherAttribute]: string;
} = {
  ...WEATHER_ATTRIBUTE_ICON_MAP,
  precipitation: "mdi:weather-rainy",
};

@customElement("wfc-current-weather")
export class WfcCurrentWeather extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) hourlyForecast?: ForecastAttribute[];
  @property({ attribute: false }) dailyForecast?: ForecastAttribute[];
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  protected createRenderRoot() {
    return this;
  }

  render(): TemplateResult | typeof nothing {
    if (!this.hass || !this.weatherEntity) {
      return nothing;
    }

    const { state } = this.weatherEntity;
    const currentTemperature = this.getTemperature();
    const secondaryInfo = this.getSecondaryWeatherAttribute();
    const isNightTime = this.isNightTime();
    const attributes = this.getConfiguredAttributes();
    const name =
      this.config.name || this.weatherEntity.attributes.friendly_name;

    return html`
      <div class="wfc-current-weather">
        <div class="wfc-current-conditions">
          <wfc-weather-condition-icon-provider
            .config=${this.config}
            .state=${state}
            .isNightTime=${isNightTime}
            .classes=${"wfc-current-icon"}
          ></wfc-weather-condition-icon-provider>
          <div class="wfc-name-state">
            <span class="wfc-current-state">
              ${this.hass.formatEntityState(this.weatherEntity)}
            </span>
            ${name
              ? html`<span class="wfc-name wfc-secondary">${name}</span>`
              : nothing}
          </div>
          <div class="wfc-current-primary-secondary">
            ${currentTemperature !== null
              ? html`
                  <div
                    class="wfc-current-temperature"
                    .actionHandler=${actionHandler({
                      stopPropagation: true,
                      hasHold: hasAction(
                        this.config.hold_action as ActionConfig
                      ),
                      hasDoubleClick: hasAction(
                        this.config.double_tap_action as ActionConfig
                      ),
                    })}
                    @action=${this.onAction}
                  >
                    ${currentTemperature}
                  </div>
                `
              : nothing}
            ${secondaryInfo
              ? html`
                  <div class="wfc-current-secondary-info">
                    ${secondaryInfo.stateObj
                      ? html`
                          <ha-state-icon
                            class="wfc-current-secondary-icon wfc-secondary"
                            .hass=${this.hass}
                            .stateObj=${secondaryInfo.stateObj}
                            .icon=${secondaryInfo.icon}
                          ></ha-state-icon>
                        `
                      : secondaryInfo.icon
                        ? html`
                            <ha-attribute-icon
                              class="wfc-current-secondary-icon wfc-secondary"
                              .hass=${this.hass}
                              .icon=${secondaryInfo.icon}
                            ></ha-attribute-icon>
                          `
                        : nothing}
                    <span class="wfc-current-secondary-value wfc-secondary"
                      >${secondaryInfo.value}</span
                    >
                  </div>
                `
              : nothing}
          </div>
        </div>
        ${attributes.length > 0
          ? html`<wfc-current-weather-attributes
              .hass=${this.hass}
              .weatherEntity=${this.weatherEntity}
              .config=${this.config}
              .attributeConfigs=${attributes}
            ></wfc-current-weather-attributes>`
          : nothing}
      </div>
    `;
  }

  private isNightTime(): boolean {
    const suntimesInfo = getSuntimesInfo(this.hass, new Date());

    return this.config.forecast?.show_sun_times && suntimesInfo
      ? suntimesInfo.isNightTime
      : false;
  }

  private getConfiguredAttributes(): NormalizedAttributeConfig[] {
    const showAttr = this.config.current?.show_attributes;

    if (showAttr === undefined || showAttr === null) {
      return [];
    }

    // Handle boolean: true means all attributes, false means none
    if (typeof showAttr === "boolean") {
      return showAttr
        ? CURRENT_WEATHER_ATTRIBUTES.map((name) => ({ name }))
        : [];
    }

    // Handle single string: "humidity"
    if (typeof showAttr === "string") {
      return [{ name: showAttr as CurrentWeatherAttributes }];
    }

    // Handle single object: { name: "humidity", entity: "sensor.my_humidity" }
    if (!Array.isArray(showAttr) && typeof showAttr === "object") {
      return showAttr.name || showAttr.entity
        ? [showAttr as CurrentWeatherAttributeConfig]
        : [];
    }

    // Handle array: mixed strings and objects. The editor inserts a null
    // placeholder when a new list item is added, so drop null/empty entries.
    // Keep any item that identifies a value source: a name (weather attribute)
    // or an entity (arbitrary custom attribute).
    if (Array.isArray(showAttr)) {
      return showAttr
        .filter((item) => item != null)
        .map((item) =>
          typeof item === "string"
            ? { name: item as CurrentWeatherAttributes }
            : (item as CurrentWeatherAttributeConfig)
        )
        .filter((item) => Boolean(item.name) || Boolean(item.entity));
    }

    return [];
  }

  private onAction = (event: ActionHandlerEvent): void => {
    const temperatureEntity = this.config.current?.temperature_entity;
    const config = temperatureEntity
      ? {
          ...this.config,
          entity: temperatureEntity,
        }
      : this.config;

    handleAction(this, this.hass!, config, event.detail.action);
  };

  private getTemperature(): string | null {
    const temperatureEntity = this.config.current?.temperature_entity;
    if (temperatureEntity) {
      const tempEntity = this.hass.states[temperatureEntity];
      if (tempEntity) {
        return formatTemperature(
          this.hass,
          this.weatherEntity,
          tempEntity.state,
          this.config.current?.temperature_precision
        );
      }
    }

    if (this.weatherEntity.attributes.temperature != null) {
      return formatTemperature(
        this.hass,
        this.weatherEntity,
        this.weatherEntity.attributes.temperature,
        this.config.current?.temperature_precision
      );
    }

    return null;
  }

  private getSecondaryWeatherAttribute(): SecondaryInfo | null {
    const forecast = this.hourlyForecast;

    const rawSecondaryInfoAttribute =
      this.config.current?.secondary_info_attribute;

    if (rawSecondaryInfoAttribute) {
      // Normalize to object form
      const secondaryAttr =
        typeof rawSecondaryInfoAttribute === "string"
          ? { name: rawSecondaryInfoAttribute as CurrentWeatherAttributes }
          : rawSecondaryInfoAttribute;

      const { name, entity: customEntityId, icon: explicitIcon } = secondaryAttr;

      if (customEntityId) {
        // Custom entity path: skip the in-attributes check
        const value = formatCustomEntityAttributeValue(
          this.hass,
          this.weatherEntity,
          this.config,
          name,
          customEntityId
        );

        if (value != null) {
          const customEntity = this.hass.states[customEntityId];

          if (!name) {
            // Entity-only: let ha-state-icon resolve the entity's own icon.
            return { stateObj: customEntity, icon: explicitIcon, value };
          }

          const icon =
            explicitIcon ??
            customEntity?.attributes?.icon ??
            (EXTENDED_WEATHER_ATTRIBUTE_ICON_MAP as Record<string, string>)[
              name
            ];

          return { icon, value };
        }
      } else if (name && name in this.weatherEntity.attributes) {
        // Weather entity path: existing behavior
        const nameAsKnown = name as CurrentWeatherAttributes;
        const weatherAttrIcon =
          EXTENDED_WEATHER_ATTRIBUTE_ICON_MAP[nameAsKnown];

        const value = formatWeatherEntityAttributeValue(
          this.hass,
          this.weatherEntity,
          this.config,
          name
        );

        if (value != null) {
          const icon = explicitIcon ?? weatherAttrIcon;
          return { icon, value };
        }
      }
    }

    const extrema = this.getTemperatureExtrema();

    if (extrema) {
      return {
        value: `${extrema.high} / ${extrema.low}`,
      };
    }

    let value: number;
    let attribute: ExtendedCurrentWeatherAttribute;

    if (forecast && forecast.length && forecast[0]?.precipitation != null) {
      value = forecast[0].precipitation!;
      attribute = "precipitation";
    } else if ("humidity" in this.weatherEntity.attributes) {
      value = this.weatherEntity.attributes.humidity!;
      attribute = "humidity";
    } else {
      return null;
    }

    const weatherAttrIcon = EXTENDED_WEATHER_ATTRIBUTE_ICON_MAP[attribute];

    return {
      icon: weatherAttrIcon,
      value: this.hass.formatEntityAttributeValue(
        this.weatherEntity,
        attribute,
        value
      ),
    };
  }

  private getTemperatureExtrema(): TemperatureExtrema | null {
    if (!this.hourlyForecast?.length || !this.dailyForecast?.length) {
      return null;
    }

    const todayTimestamp = normalizeDate(new Date().toISOString());

    let minTemp =
      this.dailyForecast[0]?.templow ??
      this.dailyForecast[0]?.temperature ??
      Infinity;
    let maxTemp = this.dailyForecast[0]?.temperature ?? -Infinity;

    for (const entry of this.hourlyForecast) {
      if (normalizeDate(entry.datetime) === todayTimestamp) {
        const low = entry.templow ?? entry.temperature;
        const high = entry.temperature;

        if (low != null && low < minTemp) {
          minTemp = low;
        }

        if (high != null && high > maxTemp) {
          maxTemp = high;
        }
      }
    }

    if (minTemp === Infinity || maxTemp === -Infinity) {
      return null;
    }

    return {
      high: formatTemperature(
        this.hass,
        this.weatherEntity,
        maxTemp,
        this.config.current?.temperature_precision
      ),
      low: formatTemperature(
        this.hass,
        this.weatherEntity,
        minTemp,
        this.config.current?.temperature_precision
      ),
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-current-weather": WfcCurrentWeather;
  }
}
