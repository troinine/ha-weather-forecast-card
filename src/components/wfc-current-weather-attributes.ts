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
  formatWeatherEntityAttributeValue,
  WEATHER_ATTRIBUTE_ICON_MAP,
  WeatherEntity,
} from "../data/weather";

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
    const value = formatWeatherEntityAttributeValue(
      this.hass,
      this.weatherEntity,
      this.config,
      attribute
    );

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
          .icon=${WEATHER_ATTRIBUTE_ICON_MAP[attribute]}
        ></ha-attribute-icon>
        <span class="wfc-current-attribute-name">
          ${this.localize(attribute)}
        </span>
        <span class="wfc-current-attribute-value">${value}</span>
      </div>
    `;
  }

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
