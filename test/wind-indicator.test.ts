import { describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { ExtendedHomeAssistant } from "../src/types";
import { WfcWindIndicator } from "../src/components/wfc-wind-indicator";
import { ForecastAttribute, WeatherEntity } from "../src/data/weather";

import "../src/components/wfc-wind-indicator";

describe("wfc-wind-indicator", () => {
  describe("rendering", () => {
    it("should render nothing when hass is not provided", async () => {
      const mockHass = new MockHass();
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const weatherEntity = hass.states["weather.demo"];
      const forecast: ForecastAttribute = {
        wind_speed: 10,
        wind_bearing: 180,
      } as ForecastAttribute;

      const element = await fixture<WfcWindIndicator>(
        html`<wfc-wind-indicator
          .hass=${null}
          .weatherEntity=${weatherEntity}
          .forecast=${forecast}
        ></wfc-wind-indicator>`
      );
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector("svg")).toBeNull();
    });

    it("should render nothing when forecast is not provided", async () => {
      const mockHass = new MockHass();
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const weatherEntity = hass.states["weather.demo"];

      const element = await fixture<WfcWindIndicator>(
        html`<wfc-wind-indicator
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .forecast=${null}
        ></wfc-wind-indicator>`
      );
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector("svg")).toBeNull();
    });

    it("should render nothing when weatherEntity is not provided", async () => {
      const mockHass = new MockHass();
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const forecast: ForecastAttribute = {
        wind_speed: 10,
        wind_bearing: 180,
      } as ForecastAttribute;

      const element = await fixture<WfcWindIndicator>(
        html`<wfc-wind-indicator
          .hass=${hass}
          .weatherEntity=${null}
          .forecast=${forecast}
        ></wfc-wind-indicator>`
      );
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector("svg")).toBeNull();
    });

    it("should render svg with circle and arrow for valid data", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 180,
      });

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.querySelector("circle")).not.toBeNull();
      expect(svg?.querySelector("polygon")).not.toBeNull();
      expect(svg?.querySelector("text")).not.toBeNull();
    });

    it("should display wind speed as text inside circle", async () => {
      const element = await createFixture({
        windSpeed: 15.7,
        windBearing: 90,
      });

      const text = element.shadowRoot?.querySelector("text");
      expect(text?.textContent).toBe("16"); // rounded
    });

    it("should handle zero wind speed", async () => {
      const element = await createFixture({
        windSpeed: 0,
        windBearing: 0,
      });

      const text = element.shadowRoot?.querySelector("text");
      expect(text?.textContent).toBe("0");
    });

    it("should set aria-label with wind data", async () => {
      const element = await createFixture({
        windSpeed: 12,
        windBearing: 270,
      });

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg?.getAttribute("aria-label")).toBe(
        "Wind speed: 12, bearing: 270 degrees"
      );
    });

    it("should render with default values when wind_speed is undefined", async () => {
      const mockHass = new MockHass();
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const weatherEntity = hass.states["weather.demo"];
      const forecast: ForecastAttribute = {
        wind_bearing: 90,
      } as ForecastAttribute;

      const element = await fixture<WfcWindIndicator>(
        html`<wfc-wind-indicator
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .forecast=${forecast}
        ></wfc-wind-indicator>`
      );
      await element.updateComplete;

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg).not.toBeNull();
      const text = element.shadowRoot?.querySelector("text");
      expect(text?.textContent).toBe("0"); // defaults to 0
    });

    it("should render with default values when wind_bearing is undefined", async () => {
      const mockHass = new MockHass();
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const weatherEntity = hass.states["weather.demo"];
      const forecast: ForecastAttribute = {
        wind_speed: 5,
      } as ForecastAttribute;

      const element = await fixture<WfcWindIndicator>(
        html`<wfc-wind-indicator
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .forecast=${forecast}
        ></wfc-wind-indicator>`
      );
      await element.updateComplete;

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg).not.toBeNull();
      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(0"); // defaults to 0
    });

    it("should render with default values when both wind properties are undefined", async () => {
      const mockHass = new MockHass();
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const weatherEntity = hass.states["weather.demo"];
      const forecast: ForecastAttribute = {} as ForecastAttribute;

      const element = await fixture<WfcWindIndicator>(
        html`<wfc-wind-indicator
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .forecast=${forecast}
        ></wfc-wind-indicator>`
      );
      await element.updateComplete;

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg).not.toBeNull();
      const text = element.shadowRoot?.querySelector("text");
      expect(text?.textContent).toBe("0");
      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(0");
    });
  });

  describe("wind bearing rotation", () => {
    it("should apply correct rotation transform for north (0 degrees)", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 0,
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(0");
    });

    it("should apply correct rotation transform for east (90 degrees)", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 90,
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(90");
    });

    it("should apply correct rotation transform for south (180 degrees)", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 180,
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(180");
    });

    it("should apply correct rotation transform for west (270 degrees)", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 270,
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(270");
    });
  });

  describe("type: bearing vs direction", () => {
    it('should use bearing as-is when type is "bearing"', async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 45,
        type: "bearing",
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      expect(transform).toContain("rotate(45");
    });

    it('should add 180 degrees when type is "direction"', async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 45,
        type: "direction",
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      // 45 + 180 = 225
      expect(transform).toContain("rotate(225");
    });

    it('should wrap around 360 when type is "direction" and bearing + 180 > 360', async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 270,
        type: "direction",
      });

      const group = element.shadowRoot?.querySelector("g");
      const transform = group?.getAttribute("transform");
      // (270 + 180) % 360 = 90
      expect(transform).toContain("rotate(90");
    });

    it('should use original bearing in aria-label when type is "bearing"', async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 45,
        type: "bearing",
      });

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg?.getAttribute("aria-label")).toBe(
        "Wind speed: 10, bearing: 45 degrees"
      );
    });

    it('should use computed bearing in aria-label when type is "direction"', async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 45,
        type: "direction",
      });

      const svg = element.shadowRoot?.querySelector("svg");
      // 45 + 180 = 225
      expect(svg?.getAttribute("aria-label")).toBe(
        "Wind speed: 10, bearing: 225 degrees"
      );
    });

    it('should use wrapped bearing in aria-label when type is "direction" and wraps', async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 270,
        type: "direction",
      });

      const svg = element.shadowRoot?.querySelector("svg");
      // (270 + 180) % 360 = 90
      expect(svg?.getAttribute("aria-label")).toBe(
        "Wind speed: 10, bearing: 90 degrees"
      );
    });
  });

  describe("wind speed colors", () => {
    it("should use low wind color for calm wind (0-3 m/s)", async () => {
      // MockHass uses m/s for wind speed
      const element = await createFixture({
        windSpeed: 2,
        windBearing: 0,
      });

      const circle = element.shadowRoot?.querySelector("circle");
      const polygon = element.shadowRoot?.querySelector("polygon");

      // Should use --wfc-wind-low CSS variable
      expect(circle?.getAttribute("stroke")).toBe("var(--wfc-wind-low)");
      expect(polygon?.getAttribute("fill")).toBe("var(--wfc-wind-low)");
    });

    it("should use medium wind color for moderate wind (3-8 m/s)", async () => {
      // MockHass uses m/s for wind speed
      const element = await createFixture({
        windSpeed: 5,
        windBearing: 0,
      });

      const circle = element.shadowRoot?.querySelector("circle");
      const polygon = element.shadowRoot?.querySelector("polygon");

      expect(circle?.getAttribute("stroke")).toBe("var(--wfc-wind-medium)");
      expect(polygon?.getAttribute("fill")).toBe("var(--wfc-wind-medium)");
    });

    it("should use high wind color for strong wind (>8 m/s)", async () => {
      // MockHass uses m/s for wind speed
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 0,
      });

      const circle = element.shadowRoot?.querySelector("circle");
      const polygon = element.shadowRoot?.querySelector("polygon");

      expect(circle?.getAttribute("stroke")).toBe("var(--wfc-wind-high)");
      expect(polygon?.getAttribute("fill")).toBe("var(--wfc-wind-high)");
    });
  });

  describe("custom sizing", () => {
    it("should use default size of 35", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 0,
      });

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("35");
      expect(svg?.getAttribute("height")).toBe("35");
    });

    it("should accept custom size", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 0,
        size: 50,
      });

      const svg = element.shadowRoot?.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("50");
      expect(svg?.getAttribute("height")).toBe("50");
    });

    it("should use default radius of 20", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 0,
      });

      const circle = element.shadowRoot?.querySelector("circle");
      expect(circle?.getAttribute("r")).toBe("20");
    });

    it("should accept custom radius", async () => {
      const element = await createFixture({
        windSpeed: 10,
        windBearing: 0,
        radius: 25,
      });

      const circle = element.shadowRoot?.querySelector("circle");
      expect(circle?.getAttribute("r")).toBe("25");
    });
  });
});

interface CreateFixtureOptions {
  hass?: ExtendedHomeAssistant;
  weatherEntity?: WeatherEntity;
  forecast?: ForecastAttribute;
  windSpeed: number;
  windBearing: number;
  size?: number;
  radius?: number;
  type?: "bearing" | "direction";
}

const createFixture = async (options: CreateFixtureOptions) => {
  const mockHass = new MockHass();
  const hass = options.hass ?? (mockHass.getHass() as ExtendedHomeAssistant);
  const weatherEntity = options.weatherEntity ?? hass.states["weather.demo"];
  const forecast: ForecastAttribute =
    options.forecast ??
    ({
      wind_speed: options.windSpeed,
      wind_bearing: options.windBearing,
    } as ForecastAttribute);

  const element = await fixture<WfcWindIndicator>(
    html`<wfc-wind-indicator
      .hass=${hass}
      .weatherEntity=${weatherEntity}
      .forecast=${forecast}
      .type=${options.type ?? "bearing"}
    ></wfc-wind-indicator>`
  );

  // Only override defaults if explicitly provided
  if (options.size !== undefined) element.size = options.size;
  if (options.radius !== undefined) element.radius = options.radius;

  await element.updateComplete;

  return element;
};
