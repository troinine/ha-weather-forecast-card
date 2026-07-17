import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { capitalize } from "lodash-es";
import memoizeOne from "memoize-one";
import {
  CURRENT_WEATHER_ATTRIBUTES,
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../types";
import {
  formatCustomEntityAttributeValue,
  formatWeatherEntityAttributeValue,
  resolveAttributeIcon,
  WeatherEntity,
} from "../data/weather";
import type { NormalizedAttributeConfig } from "./wfc-current-weather";

@customElement("wfc-current-weather-attributes")
export class WfcCurrentWeatherAttributes extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false })
  attributeConfigs: NormalizedAttributeConfig[] = [];
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    if (
      !this.hass ||
      !this.weatherEntity ||
      this.attributeConfigs.length === 0
    ) {
      return nothing;
    }

    const compact = this.config?.current?.attributes_layout === "compact";

    const attributeTemplates = this.attributeConfigs
      .map((attrConfig) => this._renderAttribute(attrConfig, compact))
      .filter((template) => template !== nothing);

    if (attributeTemplates.length === 0) {
      return nothing;
    }

    return html`
      <div
        class=${classMap({
          "wfc-current-attributes": true,
          "wfc-compact": compact,
        })}
      >
        ${attributeTemplates}
      </div>
    `;
  }

  private _renderAttribute(
    attrConfig: NormalizedAttributeConfig,
    compact: boolean
  ): TemplateResult | typeof nothing {
    if (!attrConfig || (!attrConfig.name && !attrConfig.entity)) {
      return nothing;
    }

    const {
      name: attribute,
      entity: customEntityId,
      label: explicitLabel,
      icon: explicitIcon,
    } = attrConfig;

    // Resolve the value from the custom entity if one is given, otherwise from
    // the weather entity using the attribute name.
    let value: string | undefined;
    if (customEntityId) {
      value = formatCustomEntityAttributeValue(
        this.hass,
        this.weatherEntity,
        this.config,
        attribute,
        customEntityId
      );
    } else if (attribute) {
      value = formatWeatherEntityAttributeValue(
        this.hass,
        this.weatherEntity,
        this.config,
        attribute
      );
    }

    if (!value) {
      return nothing;
    }

    const stateObj = customEntityId
      ? this.hass.states[customEntityId] || this.weatherEntity
      : this.weatherEntity;

    const customEntity = customEntityId
      ? this.hass.states[customEntityId]
      : undefined;

    // A pure custom-entity item (an entity with no weather-attribute name) lets HA's
    // ha-state-icon resolve the icon, so it honors the entity's own icon from any source
    // (state attribute, registry, icons.json translations, device_class default). An
    // attribute-backed item keeps the weather-attribute icon so it matches its label.
    const iconTemplate =
      customEntity && !attribute
        ? html`
            <ha-state-icon
              class="wfc-current-attribute-icon"
              .hass=${this.hass}
              .stateObj=${customEntity}
              .icon=${explicitIcon}
            ></ha-state-icon>
          `
        : html`
            <ha-attribute-icon
              class="wfc-current-attribute-icon"
              .hass=${this.hass}
              .stateObj=${stateObj}
              .attribute=${attribute}
              .icon=${resolveAttributeIcon(
                attribute,
                explicitIcon,
                customEntity
              )}
            ></ha-attribute-icon>
          `;

    const label = this.resolveLabel(attribute, explicitLabel, customEntity);

    return html`
      <div
        class="wfc-current-attribute"
        role=${compact ? "img" : nothing}
        aria-label=${compact ? `${label}, ${value}` : nothing}
        title=${compact ? label : nothing}
      >
        ${iconTemplate}
        ${compact
          ? nothing
          : html`<span class="wfc-current-attribute-name">${label}</span>`}
        <span class="wfc-current-attribute-value">${value}</span>
      </div>
    `;
  }

  private resolveLabel(
    attribute: string | undefined,
    explicitLabel: string | undefined,
    customEntity: { attributes?: { friendly_name?: string } } | undefined
  ): string {
    if (explicitLabel) {
      return explicitLabel;
    }
    if (
      attribute &&
      (CURRENT_WEATHER_ATTRIBUTES as ReadonlyArray<string>).includes(attribute)
    ) {
      return this.localize(attribute);
    }
    return (
      customEntity?.attributes?.friendly_name ??
      (attribute ? capitalize(attribute).replace(/_/g, " ") : "")
    );
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
