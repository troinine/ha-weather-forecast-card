import { describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import {
  ExtendedHomeAssistant,
  ForecastMode,
  WeatherForecastCardConfig,
} from "../src/types";
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";
import {
  formatDay,
  formatDayOfMonth,
  formatHour,
  formatHourParts,
} from "../src/helpers";

import "../src/index";

describe("time format rendering", () => {
  const testConfig: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
    forecast: {
      mode: ForecastMode.Simple,
      show_sun_times: false,
    },
  };

  describe("24-hour format (no suffix)", () => {
    const mockHassInstance = new MockHass({ use12HourClock: false });
    mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
    mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    it("should render single-row time labels for hourly forecast", async () => {
      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(testConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Click to switch to hourly
      const forecastContainer = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      );
      forecastContainer?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      const firstTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(firstTimeLabel).not.toBeNull();

      // Should NOT have wfc-two-rows class
      expect(firstTimeLabel?.classList.contains("wfc-two-rows")).toBe(false);

      // Should have single text content matching formatHour
      expect(firstTimeLabel?.textContent?.trim()).toBe(
        formatHour(hass, TEST_FORECAST_HOURLY[0].datetime)
      );
    });

    it("should render single-row day labels for daily forecast", async () => {
      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(testConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      const firstTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(firstTimeLabel).not.toBeNull();

      // Should NOT have wfc-two-rows class
      expect(firstTimeLabel?.classList.contains("wfc-two-rows")).toBe(false);

      // Should have single text content matching formatDay
      expect(firstTimeLabel?.textContent?.trim()).toBe(
        formatDay(hass, TEST_FORECAST_DAILY[0].datetime)
      );
    });
  });

  describe("12-hour AM/PM format", () => {
    const mockHassInstance = new MockHass({ use12HourClock: true });
    mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
    mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    it("should render two-row time labels for hourly forecast with AM/PM", async () => {
      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(testConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Click to switch to hourly
      const forecastContainer = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      );
      forecastContainer?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      const firstTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(firstTimeLabel).not.toBeNull();

      // Should have wfc-two-rows class
      expect(firstTimeLabel?.classList.contains("wfc-two-rows")).toBe(true);

      // Should have primary and secondary elements
      const primary = firstTimeLabel?.querySelector(
        ".wfc-forecast-slot-time-primary"
      );
      const secondary = firstTimeLabel?.querySelector(
        ".wfc-forecast-slot-time-secondary"
      );
      expect(primary).not.toBeNull();
      expect(secondary).not.toBeNull();

      // Verify content matches formatHourParts
      const parts = formatHourParts(hass, TEST_FORECAST_HOURLY[0].datetime);
      expect(primary?.textContent?.trim()).toBe(parts.hour);
      expect(secondary?.textContent?.trim()).toBe(parts.suffix);
    });

    it("should render two-row day labels for daily forecast with day of month", async () => {
      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(testConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      const firstTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(firstTimeLabel).not.toBeNull();

      // Should have wfc-two-rows class
      expect(firstTimeLabel?.classList.contains("wfc-two-rows")).toBe(true);

      // Should have primary and secondary elements
      const primary = firstTimeLabel?.querySelector(
        ".wfc-forecast-slot-time-primary"
      );
      const secondary = firstTimeLabel?.querySelector(
        ".wfc-forecast-slot-time-secondary"
      );
      expect(primary).not.toBeNull();
      expect(secondary).not.toBeNull();

      // Verify content
      expect(primary?.textContent?.trim()).toBe(
        formatDay(hass, TEST_FORECAST_DAILY[0].datetime)
      );
      expect(secondary?.textContent?.trim()).toBe(
        formatDayOfMonth(hass, TEST_FORECAST_DAILY[0].datetime)
      );
    });

    it("should ensure consistent height between daily and hourly views", async () => {
      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(testConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check daily view has two rows
      let forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      const dailyTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(dailyTimeLabel?.classList.contains("wfc-two-rows")).toBe(true);

      // Switch to hourly
      const forecastContainer = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      );
      forecastContainer?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Check hourly view also has two rows
      forecastItems = card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      const hourlyTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(hourlyTimeLabel?.classList.contains("wfc-two-rows")).toBe(true);
    });
  });

  describe("formatHourParts helper", () => {
    it("should return hour without suffix for 24-hour format", () => {
      const mockHassInstance = new MockHass({ use12HourClock: false });
      const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

      const testDate = "2024-01-15T16:00:00Z";
      const parts = formatHourParts(hass, testDate);

      expect(parts.hour).toBeDefined();
      expect(parts.suffix).toBeUndefined();
    });

    it("should return hour with AM/PM suffix for 12-hour format", () => {
      const mockHassInstance = new MockHass({ use12HourClock: true });
      const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

      const testDate = "2024-01-15T16:00:00Z";
      const parts = formatHourParts(hass, testDate);

      expect(parts.hour).toBeDefined();
      expect(parts.suffix).toBeDefined();
      // AM/PM suffix should be present
      expect(["AM", "PM", "am", "pm"]).toContain(parts.suffix);
    });
  });
});
