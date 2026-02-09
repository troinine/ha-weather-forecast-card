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
import { TEST_FORECAST_HOURLY } from "./mocks/test-data";

/**
 * Tests for weather entities that only support hourly forecasts (not daily).
 * This ensures symmetric coverage with daily-only entities to verify the
 * subscribe + auto-switch logic works for both single-forecast configurations.
 */
describe("hourly-only forecast", () => {
  /**
   * Create a mock hass instance with only hourly forecast support.
   * We'll set daily to empty after getting the initial hass instance.
   */
  const mockHassInstance = new MockHass();

  // Set up hourly forecast first
  mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;

  // Get the hass instance first (which needs initial data)
  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  // Now clear daily forecast to simulate hourly-only entity
  mockHassInstance.dailyForecast = [];

  // Override supported_features to only include FORECAST_HOURLY (2)
  // Not including FORECAST_DAILY (1)
  hass.states["weather.demo"].attributes.supported_features = 2;

  describe("simple mode", () => {
    const testConfig: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "hourly",
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

    it("should render card with hourly forecast", async () => {
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

    it("should display hourly forecast data", async () => {
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBeGreaterThan(0);
    });

    it("should have hourly as current forecast type", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("hourly");
    });

    it("should not crash when daily forecast is unavailable", async () => {
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData).toBeUndefined();

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

      // With hourly-only forecast, secondary info should still render
      expect(textSecondary!.length).toBeGreaterThan(0);
    });

    it("should respect hourly_slots limit", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly",
        forecast: {
          mode: ForecastMode.Simple,
          hourly_slots: 12,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(12);
    });

    it("should not toggle to daily when only hourly is available", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("hourly");

      // Try to toggle
      // @ts-expect-error: accessing private method
      card._toggleForecastView();

      await card.updateComplete;

      // Should still be hourly
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("hourly");
    });

    it("should auto-switch to hourly if config specifies daily but only hourly is available", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "daily", // Request daily
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

      // Should auto-switch to hourly since daily is not available
      // @ts-expect-error: accessing private property
      expect(testCard._currentForecastType).toBe("hourly");
    });

    it("should respect hourly_group_size aggregation", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly",
        forecast: {
          mode: ForecastMode.Simple,
          hourly_group_size: 3,
          hourly_slots: 8,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // With group_size=3, we aggregate every 3 hours
      // With slots=8, we should get 8 aggregated items
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(8);
    });
  });

  describe("chart mode", () => {
    const testConfig: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "hourly",
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

    it("should render card with hourly forecast in chart mode", async () => {
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render chart container", async () => {
      const chartContainer =
        card.shadowRoot?.querySelector("wfc-forecast-chart");
      expect(chartContainer).not.toBeNull();
    });

    it("should display hourly forecast data in chart", async () => {
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBeGreaterThan(0);
    });

    it("should have hourly as current forecast type", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("hourly");
    });

    it("should not crash when daily forecast is unavailable in chart mode", async () => {
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData).toBeUndefined();

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

    it("should respect hourly_slots limit in chart mode", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly",
        forecast: {
          mode: ForecastMode.Chart,
          hourly_slots: 24,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(24);
    });

    it("should respect hourly_group_size in chart mode", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly",
        forecast: {
          mode: ForecastMode.Chart,
          hourly_group_size: 2,
          hourly_slots: 12,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // With group_size=2 and slots=12, we should get 12 aggregated items
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(12);
    });
  });
});
