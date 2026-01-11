import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { capitalize } from "lodash-es";
import memoizeOne from "memoize-one";
import {
  CurrentWeatherAttributes,
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../types";
import {
  formatTemperature,
  getWeatherUnit,
  getWind,
  WeatherEntity,
} from "../data/weather";

const ATTRIBUTE_ICON_MAP: { [key in CurrentWeatherAttributes]: string } = {
  humidity: "mdi:cloud-percent-outline",
  pressure: "mdi:gauge",
  wind_speed: "mdi:weather-windy-variant",
  wind_gust_speed: "mdi:weather-windy",
  visibility: "mdi:eye",
  ozone: "mdi:molecule",
  uv_index: "mdi:weather-sunny-alert",
  dew_point: "mdi:water-thermometer-outline",
  apparent_temperature: "mdi:thermometer",
  cloud_coverage: "mdi:cloud-outline",
};

@customElement("wfc-current-weather-attributes")
export class WfcCurrentWeatherAttributes extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false })
  weatherAttributes: CurrentWeatherAttributes[] = [];
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    if (
      !this.hass ||
      !this.weatherEntity ||
      this.weatherAttributes.length === 0
    ) {
      return nothing;
    }

    const attributeTemplates = this.weatherAttributes
      .map((attr) => this._renderAttribute(attr))
      .filter((template) => template !== nothing);

    if (attributeTemplates.length === 0) {
      return nothing;
    }

    return html`
      <div class="wfc-current-attributes">${attributeTemplates}</div>
    `;
  }

  private _renderAttribute(
    attribute: CurrentWeatherAttributes
  ): TemplateResult | typeof nothing {
    const value = this.computeAttributeValue(attribute);

    if (!value) {
      return nothing;
    }

    return html`
      <div class="wfc-current-attribute">
        <ha-attribute-icon
          class="wfc-current-attribute-icon"
          .hass=${this.hass}
          .stateObj=${this.weatherEntity}
          .attribute=${attribute}
          .icon=${ATTRIBUTE_ICON_MAP[attribute]}
        ></ha-attribute-icon>
        <span class="wfc-current-attribute-name">
          ${this.localize(attribute)}
        </span>
        <span class="wfc-current-attribute-value">${value}</span>
      </div>
    `;
  }

  private computeAttributeValue = (
    attribute: CurrentWeatherAttributes
  ): string | undefined => {
    const stateObj = this.weatherEntity;
    const value = stateObj.attributes[attribute];

    if (value === undefined) {
      return undefined;
    }

    if (attribute === "wind_speed") {
      return getWind(this.hass, stateObj);
    }

    // hass.formatEntityAttributeValue does not support wind_gust_speed yet
    if (attribute === "wind_gust_speed") {
      const unit = getWeatherUnit(this.hass, stateObj, "wind_gust_speed");

      return `${value} ${unit}`;
    }

    // hass.formatEntityAttributeValue does not support ozone yet
    if (attribute === "ozone") {
      const unit = getWeatherUnit(this.hass, stateObj, "ozone");

      return `${value} ${unit}`;
    }

    // Temperature related attributes need special handling for precision
    if (attribute === "apparent_temperature" || attribute === "dew_point") {
      return formatTemperature(
        this.hass,
        stateObj,
        value,
        this.config.current?.temperature_precision
      );
    }

    return this.hass.formatEntityAttributeValue(this.weatherEntity, attribute);
  };

  private localize = (attribute: string): string => {
    return (
      this.hass.formatEntityAttributeName(this.weatherEntity, attribute) ||
      this.hass.localize(getLocalizationKey(attribute)) ||
      capitalize(attribute).replace(/_/g, " ")
    );
  };
}

const getLocalizationKey = memoizeOne((attribute: string): string => {
  switch (attribute) {
    case "pressure":
      return "ui.card.weather.attributes.air_pressure";
    default:
      return `ui.card.weather.attributes.${attribute}`;
  }
});

declare global {
  interface HTMLElementTagNameMap {
    "wfc-current-weather-attributes": WfcCurrentWeatherAttributes;
  }
}
