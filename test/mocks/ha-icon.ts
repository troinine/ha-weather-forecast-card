import { LitElement, html, TemplateResult, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mdiClose, mdiTune } from "@mdi/js";

/**
 * Mock component for ha-icon
 * Renders MDI icons for weather attributes
 */
@customElement("ha-icon")
export class HaIcon extends LitElement {
  // @ts-expect-error test component
  @property({ attribute: false }) icon!: string;

  private iconMap: { [key: string]: string } = {
    "mdi:tune": mdiTune,
    "mdi:close": mdiClose,
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
    "ha-icon": HaIcon;
  }
}
