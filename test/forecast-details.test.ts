import { describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WfcForecastDetails } from "../src/components/wfc-forecast-details";
import { ForecastAttribute } from "../src/data/weather";
import {
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
  ForecastMode,
} from "../src/types";

import "../src/components/wfc-forecast-details";

describe("wfc-forecast-details", () => {
  const mockHassInstance = new MockHass();
  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  const testConfig: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
    forecast: {
      mode: ForecastMode.Simple,
    },
  };

  describe("precipitation bar height calculation", () => {
    it("should return 0% for precipitation below 0.1", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "sunny",
        precipitation: 0.05,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const bar = element.querySelector(
        ".wfc-forecast-precip-amount-bar"
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      expect(
        bar.style.getPropertyValue("--forecast-precipitation-bar-height-pct")
      ).toBe("0%");
    });

    it("should return 10% for precipitation between 0.1 and 0.2", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "rainy",
        precipitation: 0.15,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const bar = element.querySelector(
        ".wfc-forecast-precip-amount-bar"
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      expect(
        bar.style.getPropertyValue("--forecast-precipitation-bar-height-pct")
      ).toBe("10%");
    });

    it("should calculate correct percentage for normal precipitation values", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "rainy",
        precipitation: 5,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const bar = element.querySelector(
        ".wfc-forecast-precip-amount-bar"
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      // 5mm / 10mm max = 50%
      expect(
        bar.style.getPropertyValue("--forecast-precipitation-bar-height-pct")
      ).toBe("50%");
    });

    it("should cap at 100% for precipitation exceeding max", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "pouring",
        precipitation: 15,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const bar = element.querySelector(
        ".wfc-forecast-precip-amount-bar"
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      // 15mm / 10mm max = 150%, capped at 100%
      expect(
        bar.style.getPropertyValue("--forecast-precipitation-bar-height-pct")
      ).toBe("100%");
    });

    it("should use default max precipitation of 10 when not provided", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "rainy",
        precipitation: 2.5,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
        ></wfc-forecast-details>`
      );

      const bar = element.querySelector(
        ".wfc-forecast-precip-amount-bar"
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      // 2.5mm / 10mm (default) = 25%
      expect(
        bar.style.getPropertyValue("--forecast-precipitation-bar-height-pct")
      ).toBe("25%");
    });
  });

  describe("precipitation display and styling", () => {
    it("should display precipitation amount with correct formatting", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "rainy",
        precipitation: 3.456,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const amount = element.querySelector(".wfc-forecast-precip-amount");
      expect(amount).not.toBeNull();
      expect(amount?.textContent?.trim()).toBe("3.5");
    });

    it("should add wfc-not-available class when precipitation is not available", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "sunny",
        precipitation: undefined,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const container = element.querySelector(
        ".wfc-forecast-precip-amount-container"
      );
      expect(container).not.toBeNull();
      expect(container?.classList.contains("wfc-not-available")).toBe(true);
    });

    it("should not add wfc-not-available class when precipitation is available", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "rainy",
        precipitation: 2.5,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const container = element.querySelector(
        ".wfc-forecast-precip-amount-container"
      );
      expect(container).not.toBeNull();
      expect(container?.classList.contains("wfc-not-available")).toBe(false);
    });

    it("should use classMap directive for conditional classes", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "rainy",
        precipitation: 1.5,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const container = element.querySelector(
        ".wfc-forecast-precip-amount-container"
      );
      expect(container).not.toBeNull();
      expect(
        container?.classList.contains("wfc-forecast-precip-amount-container")
      ).toBe(true);
    });
  });

  describe("temperature display", () => {
    it("should display high temperature", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 23,
        condition: "sunny",
        precipitation: 0,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
        ></wfc-forecast-details>`
      );

      const tempHigh = element.querySelector(".wfc-forecast-temperature-high");
      expect(tempHigh).not.toBeNull();
      expect(tempHigh?.textContent?.trim()).toBe("23°");
    });

    it("should display low temperature when available", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 23,
        templow: 15,
        condition: "sunny",
        precipitation: 0,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
        ></wfc-forecast-details>`
      );

      const tempLow = element.querySelector(".wfc-forecast-temperature-low");
      expect(tempLow).not.toBeNull();
      expect(tempLow?.textContent?.trim()).toBe("/15°");
    });

    it("should not display low temperature when not available", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 23,
        condition: "sunny",
        precipitation: 0,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
        ></wfc-forecast-details>`
      );

      const tempLow = element.querySelector(".wfc-forecast-temperature-low");
      expect(tempLow).toBeNull();
    });

    it("should round temperatures to nearest integer", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 23.7,
        templow: 15.2,
        condition: "sunny",
        precipitation: 0,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
        ></wfc-forecast-details>`
      );

      const tempHigh = element.querySelector(".wfc-forecast-temperature-high");
      const tempLow = element.querySelector(".wfc-forecast-temperature-low");

      expect(tempHigh?.textContent?.trim()).toBe("24°");
      expect(tempLow?.textContent?.trim()).toBe("/15°");
    });
  });

  describe("edge cases", () => {
    it("should return nothing when forecast is not provided", async () => {
      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .config=${testConfig}
        ></wfc-forecast-details>`
      );

      const container = element.querySelector(
        ".wfc-forecast-precip-amount-container"
      );
      expect(container).toBeNull();
    });

    it("should handle zero precipitation correctly", async () => {
      const forecast: ForecastAttribute = {
        datetime: "2024-01-01T12:00:00",
        temperature: 20,
        condition: "sunny",
        precipitation: 0,
      };

      const element = await fixture<WfcForecastDetails>(
        html`<wfc-forecast-details
          .hass=${hass}
          .forecast=${forecast}
          .config=${testConfig}
          .maxPrecipitation=${10}
        ></wfc-forecast-details>`
      );

      const bar = element.querySelector(
        ".wfc-forecast-precip-amount-bar"
      ) as HTMLElement;
      const amount = element.querySelector(".wfc-forecast-precip-amount");

      expect(bar).not.toBeNull();
      expect(
        bar.style.getPropertyValue("--forecast-precipitation-bar-height-pct")
      ).toBe("0%");
      expect(amount?.textContent?.trim()).toBe("0.0");
    });
  });
});
