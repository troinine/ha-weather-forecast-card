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
import {
  CURRENT_WEATHER_ATTRIBUTES,
  CurrentWeatherAttributes,
  CurrentWeatherAttributeConfig,
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../types";
import {
  ForecastAttribute,
  formatTemperature,
  formatWeatherEntityAttributeValue,
  WEATHER_ATTRIBUTE_ICON_MAP,
  WeatherEntity,
} from "../data/weather";

import "./wfc-weather-condition-icon-provider";
import "./wfc-current-weather-attributes";

export type NormalizedAttributeConfig = {
  name: CurrentWeatherAttributes;
  entity?: string;
};

type SecondaryInfo = {
  icon?: string;
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
                    ${secondaryInfo.icon
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
      return [showAttr as CurrentWeatherAttributeConfig];
    }

    // Handle array: mixed strings and objects
    if (Array.isArray(showAttr)) {
      return showAttr.map((item) => {
        if (typeof item === "string") {
          return { name: item as CurrentWeatherAttributes };
        }
        return item as CurrentWeatherAttributeConfig;
      });
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

    const secondaryInfoAttribute =
      this.config.current?.secondary_info_attribute;
    if (secondaryInfoAttribute) {
      if (secondaryInfoAttribute in this.weatherEntity.attributes) {
        const weatherAttrIcon =
          EXTENDED_WEATHER_ATTRIBUTE_ICON_MAP[secondaryInfoAttribute];

        const value = formatWeatherEntityAttributeValue(
          this.hass,
          this.weatherEntity,
          this.config,
          secondaryInfoAttribute
        );

        if (value != null) {
          return {
            icon: weatherAttrIcon,
            value,
          };
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
