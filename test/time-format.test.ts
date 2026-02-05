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
  formatHourParts,
  formatTimeParts,
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

      // Dispatch action event to switch to hourly (actionHandler doesn't work in test env)
      const forecastElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart, wfc-forecast-simple"
      );
      forecastElement?.dispatchEvent(
        new CustomEvent("action", {
          bubbles: true,
          composed: true,
          detail: { action: "tap" },
        })
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

      // Should have single text content matching formatHourParts().hour
      expect(firstTimeLabel?.textContent?.trim()).toBe(
        formatHourParts(hass, TEST_FORECAST_HOURLY[0].datetime).hour
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

      // Dispatch action event to switch to hourly (actionHandler doesn't work in test env)
      const forecastElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart, wfc-forecast-simple"
      );
      forecastElement?.dispatchEvent(
        new CustomEvent("action", {
          bubbles: true,
          composed: true,
          detail: { action: "tap" },
        })
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

  describe("German locale with 24-hour format", () => {
    const mockHassInstance = new MockHass({
      use12HourClock: false,
      language: "de",
    });
    mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
    mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    it("should use single-row layout for German 24-hour format", async () => {
      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(testConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Dispatch action event to switch to hourly (actionHandler doesn't work in test env)
      const forecastElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart, wfc-forecast-simple"
      );
      forecastElement?.dispatchEvent(
        new CustomEvent("action", {
          bubbles: true,
          composed: true,
          detail: { action: "tap" },
        })
      );
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      // German uses 24-hour format, so should NOT have two-row layout
      const firstTimeLabel = forecastItems[0].querySelector(
        ".wfc-forecast-slot-time"
      );
      expect(firstTimeLabel).not.toBeNull();
      expect(firstTimeLabel?.classList.contains("wfc-two-rows")).toBe(false);
    });

    it("should use consistent single-row layout for hourly and sunrise/sunset in German", async () => {
      const sunTimesConfig: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          mode: ForecastMode.Simple,
          show_sun_times: true,
        },
      };

      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${sunTimesConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(sunTimesConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Dispatch action event to switch to hourly (actionHandler doesn't work in test env)
      const forecastElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart, wfc-forecast-simple"
      );
      forecastElement?.dispatchEvent(
        new CustomEvent("action", {
          bubbles: true,
          composed: true,
          detail: { action: "tap" },
        })
      );
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      // All slots should use single-row layout for German 24-hour format
      forecastItems.forEach((item) => {
        const timeLabel = item.querySelector(".wfc-forecast-slot-time");
        if (timeLabel) {
          expect(timeLabel.classList.contains("wfc-two-rows")).toBe(false);
        }
      });
    });
  });

  describe("sunrise/sunset layout consistency with AM/PM", () => {
    it("should use two-row layout for sunrise/sunset when using 12-hour clock", async () => {
      const mockHassInstance = new MockHass({ use12HourClock: true });
      mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
      mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;
      const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

      // Config with show_sun_times enabled
      const sunTimesConfig: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          mode: ForecastMode.Simple,
          show_sun_times: true,
        },
      };

      const card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${sunTimesConfig}
        ></weather-forecast-card>`
      );
      card.setConfig(sunTimesConfig);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Dispatch action event to switch to hourly (actionHandler doesn't work in test env)
      const forecastElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart, wfc-forecast-simple"
      );
      forecastElement?.dispatchEvent(
        new CustomEvent("action", {
          bubbles: true,
          composed: true,
          detail: { action: "tap" },
        })
      );
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Find all forecast slots
      const forecastItems =
        card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
      expect(forecastItems.length).toBeGreaterThan(0);

      // Check all time labels - they should ALL have wfc-two-rows class
      // (both regular hours and sunrise/sunset times)
      forecastItems.forEach((item) => {
        const timeLabel = item.querySelector(".wfc-forecast-slot-time");
        expect(timeLabel).not.toBeNull();
        expect(
          timeLabel?.classList.contains("wfc-two-rows"),
          `Time label should have wfc-two-rows class for layout consistency`
        ).toBe(true);
      });

      // Specifically check sunrise/sunset slots if present
      const sunriseSlot = card.shadowRoot!.querySelector(
        ".wfc-forecast-slot-time.wfc-sunrise"
      );
      const sunsetSlot = card.shadowRoot!.querySelector(
        ".wfc-forecast-slot-time.wfc-sunset"
      );

      if (sunriseSlot) {
        expect(
          sunriseSlot.classList.contains("wfc-two-rows"),
          "Sunrise slot should have wfc-two-rows class"
        ).toBe(true);
      }

      if (sunsetSlot) {
        expect(
          sunsetSlot.classList.contains("wfc-two-rows"),
          "Sunset slot should have wfc-two-rows class"
        ).toBe(true);
      }
    });

    it("formatTimeParts should work consistently with formatHourParts for layout decisions", () => {
      const mockHassInstance = new MockHass({ use12HourClock: true });
      const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

      const testDate = "2024-01-15T06:45:00Z";

      const hourParts = formatHourParts(hass, testDate);
      const timeParts = formatTimeParts(hass, testDate);

      // If hourParts has suffix, we use two-row layout
      // timeParts may or may not have suffix, but layout should be consistent
      expect(hourParts.suffix).toBeDefined();

      // The time should be formatted
      expect(timeParts.time).toBeDefined();

      // For AM/PM locales, timeParts should also have suffix
      expect(timeParts.suffix).toBeDefined();
    });
  });
});
