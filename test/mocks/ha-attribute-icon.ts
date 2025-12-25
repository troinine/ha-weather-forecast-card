import { LitElement, html, TemplateResult, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { HassEntity } from "home-assistant-js-websocket";
import type { ExtendedHomeAssistant } from "../../src/types";
import {
  mdiCloudPercentOutline,
  mdiGauge,
  mdiWeatherWindyVariant,
  mdiWeatherWindy,
  mdiEye,
  mdiMolecule,
  mdiWeatherSunnyAlert,
  mdiWaterThermometerOutline,
} from "@mdi/js";

/**
 * Mock component for ha-attribute-icon
 * Renders MDI icons for weather attributes
 */
@customElement("ha-attribute-icon")
export class HaAttributeIcon extends LitElement {
  // @ts-expect-error test component
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  // @ts-expect-error test component
  @property({ attribute: false }) stateObj!: HassEntity;
  // @ts-expect-error test component
  @property({ attribute: false }) attribute!: string;
  // @ts-expect-error test component
  @property({ attribute: false }) icon!: string;

  private iconMap: { [key: string]: string } = {
    "mdi:cloud-percent-outline": mdiCloudPercentOutline,
    "mdi:gauge": mdiGauge,
    "mdi:weather-windy-variant": mdiWeatherWindyVariant,
    "mdi:weather-windy": mdiWeatherWindy,
    "mdi:eye": mdiEye,
    "mdi:molecule": mdiMolecule,
    "mdi:weather-sunny-alert": mdiWeatherSunnyAlert,
    "mdi:water-thermometer-outline": mdiWaterThermometerOutline,
  };

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.icon) {
      return nothing;
    }

    const iconPath = this.iconMap[this.icon];
    if (!iconPath) {
      return nothing;
    }

    return html`
      <svg
        viewBox="0 0 24 24"
        style="width: 24px; height: 24px; display: inline-block;"
      >
        <path d=${iconPath} fill="currentColor"></path>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-icon": HaAttributeIcon;
  }
}
