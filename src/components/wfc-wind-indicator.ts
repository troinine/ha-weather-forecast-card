import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("wfc-wind-indicator")
export class WfcWindIndicator extends LitElement {
  @property({ attribute: false }) windBearing = 0;
  @property({ attribute: false }) windSpeed = 0;
  @property({ attribute: false }) windUnit = "m/s";
  @property({ attribute: false }) size = 35;
  @property({ attribute: false }) radius = 15;
  @property({ attribute: false }) type: "bearing" | "direction" = "bearing";

  static styles = css`
    text {
      font-size: calc(var(--ha-font-size-s, 12px) * 1.2);
      fill: var(--primary-text-color);
    }
  `;

  render() {
    const R = this.radius;
    const padding = 8;
    const tipOffset = 7;
    const cx = R + padding;
    const cy = R + padding;
    const boxSize = 2 * (R + padding);

    const speed = Math.round(this.windSpeed || 0);
    const lineColor = computeLineColor(speed, this.windUnit);
    let bearing = this.windBearing || 0;
    if (this.type === "direction") {
      bearing = (bearing + 180) % 360;
    }

    const polar = (deg: number, r: number) => {
      const a = (deg * Math.PI) / 180;
      return {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
      };
    };

    const baseAngle = -90;
    const spread = 12;
    const p1 = polar(baseAngle - spread, R);
    const p2 = polar(baseAngle + spread, R);
    const tip = polar(baseAngle, R + tipOffset);

    return html`
      <svg
        width="${this.size}"
        height="${this.size}"
        viewBox="0 0 ${boxSize} ${boxSize}"
      >
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${R}"
          stroke="${lineColor}"
          stroke-width="3"
          fill="none"
        />

        <g transform="rotate(${bearing} ${cx} ${cy})">
          <polygon
            points="
              ${p1.x},${p1.y}
              ${p2.x},${p2.y}
              ${tip.x},${tip.y}
            "
            fill="${lineColor}"
          />
        </g>

        <text x="${cx}" y="${cy + 5}" text-anchor="middle">${speed}</text>
      </svg>
    `;
  }
}

const computeLineColor = (windSpeed: number, windUnit: string): string => {
  const unit = windUnit.toLowerCase();

  const multipliers: Record<string, number> = {
    "km/h": 1 / 3.6,
    kmh: 1 / 3.6,
    mph: 0.44704,
    kn: 0.514444,
    kt: 0.514444,
    knot: 0.514444,
    knots: 0.514444,
  };

  const multiplier = multipliers[unit] ?? 1;
  const speedMS = windSpeed * multiplier;

  if (speedMS <= 3) {
    return "var(--wfc-wind-low)";
  }

  if (speedMS <= 8) {
    return "var(--wfc-wind-medium)";
  }

  return "var(--wfc-wind-high)";
};

declare global {
  interface HTMLElementTagNameMap {
    "wfc-wind-indicator": WfcWindIndicator;
  }
}
