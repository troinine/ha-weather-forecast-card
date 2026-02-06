import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators.js";

interface SelectOption {
  value: string;
  label: string;
  icon: string;
}

@customElement("wfc-chart-attribute-selector")
export class WfcChartAttributeSelector extends LitElement {
  @property({ type: Boolean }) open: boolean = false;
  @property({ attribute: false }) public options: SelectOption[] = [];

  @property({ attribute: false }) public value?: string;

  private _boundOnClickOutside = this._onClickOutside.bind(this);

  static styles = css`
    :host {
      position: absolute;
      top: 110%;
      right: 0;
    }

    .dropdown {
      z-index: 999;
      background-color: var(--card-background-color, #fff);
      box-shadow: var(
        --ha-box-shadow-l,
        0 5px 5px -3px rgba(0, 0, 0, 0.2),
        0 8px 10px 1px rgba(0, 0, 0, 0.14),
        0 3px 14px 2px rgba(0, 0, 0, 0.12)
      );
      border-radius: 10px;
      border-style: solid;
      border-width: 1px;
      border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      padding: var(--ha-space-2, 8px) 0;
      width: max-content;
      display: flex;
      flex-direction: column;
    }

    .menu-item {
      padding: 0 16px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      font-family: var(
        --mdc-typography-subtitle1-font-family,
        Roboto,
        sans-serif
      );
      font-size: var(--mdc-typography-subtitle1-font-size, 1rem);
      font-weight: var(--mdc-typography-subtitle1-font-weight, 400);
      color: var(--primary-text-color);
      transition: background-color 0.1s;
      white-space: nowrap;
    }

    .item-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .menu-item:hover {
      background-color: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.04);
    }

    .menu-item.selected {
      color: var(--primary-color, #6200ee);
      background-color: rgba(var(--rgb-primary-color, 98, 0, 238), 0.12);
    }

    .option-icon {
      color: var(--state-icon-color, #616161);
    }
  `;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener(
      "pointerdown",
      this._boundOnClickOutside,
      true
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("open")) {
      if (this.open) {
        requestAnimationFrame(() => {
          document.addEventListener(
            "pointerdown",
            this._boundOnClickOutside,
            true
          );
        });
      } else {
        document.removeEventListener(
          "pointerdown",
          this._boundOnClickOutside,
          true
        );
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.open) {
      return nothing;
    }

    return html`
      <div class="dropdown">
        ${this.options.map((option) => this._renderOption(option))}
      </div>
    `;
  }

  private _renderOption(option: SelectOption): TemplateResult {
    const isSelected = this.value === option.value;
    return html`
      <div
        class="menu-item ${isSelected ? "selected" : ""}"
        @click=${(e: Event) => this._onSelected(e, option.value)}
      >
        <div class="item-content">
          <ha-icon class="option-icon" .icon=${option.icon}></ha-icon>
          <span>${option.label}</span>
        </div>
      </div>
    `;
  }

  private _onSelected(ev: Event, value: string): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (this.value === value) {
      this.dispatchEvent(new CustomEvent("closed"));
      return;
    }

    this.value = value;
    this.dispatchEvent(
      new CustomEvent("selected", {
        detail: { value },
      })
    );
  }

  private _onClickOutside(ev: Event): void {
    const path = ev.composedPath();

    // Clicks inside the dropdown should not close it
    if (path.includes(this)) {
      return;
    }

    // Clicks on the toggle button should not trigger close here;
    // the toggle button has its own click handler that manages state
    const isToggleButton = path.some(
      (el) =>
        el instanceof Element &&
        el.classList.contains("wfc-settings-toggle-button")
    );
    if (isToggleButton) {
      return;
    }

    this.dispatchEvent(new CustomEvent("closed"));
  }
}
