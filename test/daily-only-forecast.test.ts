import { beforeEach, describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import {
  ExtendedHomeAssistant,
  ForecastMode,
  WeatherForecastCardConfig,
} from "../src/types";

import "../src/index";
import { TEST_FORECAST_DAILY } from "./mocks/test-data";

/**
 * Tests for weather entities that only support daily forecasts (not hourly).
 * This reproduces the issue where entities with only daily forecast support
 * fail to render properly.
 */
describe("daily-only forecast", () => {
  /**
   * Create a mock hass instance with only daily forecast support.
   * We'll set hourly to empty after getting the initial hass instance.
   */
  const mockHassInstance = new MockHass();

  // Set up daily forecast first
  mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;

  // Get the hass instance first (which needs initial data)
  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  // Now clear hourly forecast to simulate daily-only entity
  mockHassInstance.hourlyForecast = [];

  // Override supported_features to only include FORECAST_DAILY (1)
  // Not including FORECAST_HOURLY (2)
  hass.states["weather.demo"].attributes.supported_features = 1;

  describe("simple mode", () => {
    const testConfig: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "daily",
      forecast: {
        mode: ForecastMode.Simple,
        show_sun_times: false,
      },
    };

    let card: WeatherForecastCard;

    beforeEach(async () => {
      card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );

      expect(card).not.toBeNull();
      expect(card).toBeInstanceOf(WeatherForecastCard);

      card.setConfig(testConfig);

      await card.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    it("should render card with daily forecast", async () => {
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render forecast items", async () => {
      const forecastContainer = card.shadowRoot?.querySelector(
        ".wfc-forecast-container"
      );
      expect(forecastContainer).not.toBeNull();

      const forecastItems = forecastContainer?.querySelectorAll(
        "wfc-forecast-simple"
      );
      expect(forecastItems).not.toBeNull();
      expect(forecastItems?.length).toBeGreaterThan(0);
    });

    it("should display daily forecast data", async () => {
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBe(TEST_FORECAST_DAILY.length);
    });

    it("should have daily as current forecast type", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("daily");
    });

    it("should not crash when hourly forecast is unavailable", async () => {
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData).toBeUndefined();

      // Card should still render
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render current weather section", async () => {
      const currentWeather = card.shadowRoot?.querySelector(
        ".wfc-current-weather-container"
      );
      expect(currentWeather).not.toBeNull();

      const temperature = currentWeather?.querySelector(
        ".wfc-current-temperature"
      );
      expect(temperature).not.toBeNull();
      expect(temperature?.textContent?.trim()).toBeTruthy();
    });

    it("should render current weather secondary info", async () => {
      const currentWeather = card.shadowRoot?.querySelector(
        ".wfc-current-weather-container"
      );
      expect(currentWeather).not.toBeNull();

      const secondaryValue = currentWeather?.querySelector(
        ".wfc-current-secondary-value"
      );
      expect(secondaryValue).not.toBeNull();

      const textSecondary = secondaryValue?.textContent
        ?.replace(/\s+/g, " ")
        .trim();
      expect(textSecondary).toBeTruthy();

      // With daily-only forecast, secondary info should still render
      // (could be humidity or other attribute depending on config)
      expect(textSecondary!.length).toBeGreaterThan(0);
    });

    it("should respect daily_slots limit", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "daily",
        forecast: {
          mode: ForecastMode.Simple,
          daily_slots: 3,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBe(3);
    });

    it("should not toggle to hourly when only daily is available", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("daily");

      // Try to toggle
      // @ts-expect-error: accessing private method
      card._toggleForecastView();

      await card.updateComplete;

      // Should still be daily
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("daily");
    });

    it("should auto-switch to daily if config specifies hourly but only daily is available", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly", // Request hourly
        forecast: {
          mode: ForecastMode.Simple,
        },
      };

      const testCard = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${config}
        ></weather-forecast-card>`
      );

      testCard.setConfig(config);
      await testCard.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should auto-switch to daily since hourly is not available
      // @ts-expect-error: accessing private property
      expect(testCard._currentForecastType).toBe("daily");
    });
  });

  describe("chart mode", () => {
    const testConfig: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "daily",
      forecast: {
        mode: ForecastMode.Chart,
        show_sun_times: false,
      },
    };

    let card: WeatherForecastCard;

    beforeEach(async () => {
      card = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );

      expect(card).not.toBeNull();
      expect(card).toBeInstanceOf(WeatherForecastCard);

      card.setConfig(testConfig);

      await card.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    it("should render card with daily forecast in chart mode", async () => {
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render chart container", async () => {
      const chartContainer =
        card.shadowRoot?.querySelector("wfc-forecast-chart");
      expect(chartContainer).not.toBeNull();
    });

    it("should display daily forecast data in chart", async () => {
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBe(TEST_FORECAST_DAILY.length);
    });

    it("should have daily as current forecast type", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("daily");
    });

    it("should not crash when hourly forecast is unavailable in chart mode", async () => {
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData).toBeUndefined();

      // Card should still render
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render chart canvas", async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const chartComponent =
        card.shadowRoot?.querySelector("wfc-forecast-chart");
      expect(chartComponent).not.toBeNull();

      // The chart should have rendered canvas
      const canvas = chartComponent?.shadowRoot?.querySelector("canvas");
      expect(canvas).not.toBeNull();
    });

    it("should respect daily_slots limit in chart mode", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "daily",
        forecast: {
          mode: ForecastMode.Chart,
          daily_slots: 4,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBe(4);
    });
  });
});

/**
 * Tests for weather entities that do not support any forecast types.
 * These entities should not attempt to subscribe to forecasts and should
 * render gracefully (showing current weather only).
 */
describe("no forecast support", () => {
  it("should not subscribe when entity has no forecast support", async () => {
    const mockHassInstance = new MockHass();
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    // Set supported_features to 0 (no forecast support)
    hass.states["weather.demo"].attributes.supported_features = 0;

    const config: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      show_forecast: true,
    };

    const card = await fixture<WeatherForecastCard>(
      html`<weather-forecast-card
        .hass=${hass}
        .config=${config}
      ></weather-forecast-card>`
    );

    card.setConfig(config);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));

    // @ts-expect-error: accessing private property
    expect(card._dailySubscription).toBeUndefined();
    // @ts-expect-error: accessing private property
    expect(card._hourlySubscription).toBeUndefined();
  });

  it("should not render forecast data when entity has no forecast support", async () => {
    const mockHassInstance = new MockHass();
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    // Set supported_features to 0 (no forecast support)
    hass.states["weather.demo"].attributes.supported_features = 0;

    const config: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      show_forecast: true,
      show_current: false, // Only forecast (which won't be available)
    };

    const card = await fixture<WeatherForecastCard>(
      html`<weather-forecast-card
        .hass=${hass}
        .config=${config}
      ></weather-forecast-card>`
    );

    card.setConfig(config);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Forecast data should be undefined (no subscriptions made)
    // @ts-expect-error: accessing private property
    expect(card._dailyForecastData).toBeUndefined();
    // @ts-expect-error: accessing private property
    expect(card._hourlyForecastData).toBeUndefined();
  });

  it("should not subscribe when show_forecast is false", async () => {
    const mockHassInstance = new MockHass();
    mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    // Entity supports forecast
    hass.states["weather.demo"].attributes.supported_features = 1;

    const config: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      show_forecast: false, // Explicitly disabled
    };

    const card = await fixture<WeatherForecastCard>(
      html`<weather-forecast-card
        .hass=${hass}
        .config=${config}
      ></weather-forecast-card>`
    );

    card.setConfig(config);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should NOT subscribe when show_forecast is false
    // @ts-expect-error: accessing private property
    expect(card._dailySubscription).toBeUndefined();
    // @ts-expect-error: accessing private property
    expect(card._hourlySubscription).toBeUndefined();
  });
});
