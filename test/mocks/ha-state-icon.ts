import { LitElement, html, TemplateResult, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { ExtendedHomeAssistant } from "../../src/types";

/**
 * Mock component for ha-state-icon
 *
 * The real element resolves an entity's icon from every HA source (state attribute,
 * entity registry, icons.json translations, device_class default, domain default),
 * which a unit test cannot replicate. This mock reflects only what is observable on
 * the state object: an explicit .icon prop, then state attributes.icon. Tests assert
 * on the .stateObj / .icon properties rather than the rendered glyph.
 */
@customElement("ha-state-icon")
export class HaStateIcon extends LitElement {
  // @ts-expect-error test component
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  // @ts-expect-error test component
  @property({ attribute: false }) stateObj?: HassEntity;
  // @ts-expect-error test component
  @property({ attribute: false }) icon?: string;

  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult | typeof nothing {
    const resolved = this.icon ?? this.stateObj?.attributes?.icon;
    if (!resolved) {
      return nothing;
    }

    return html`<span class="mock-state-icon" data-icon=${resolved}></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-icon": HaStateIcon;
  }
}
