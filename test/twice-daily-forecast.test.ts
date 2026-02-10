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
import { WeatherEntityFeature } from "../src/data/weather";

import "../src/index";

/**
 * Tests for weather entities that only support twice_daily forecasts.
 * This addresses GitHub issue #90 where entities like NWS and Yandex Pogoda
 * provide twice_daily forecasts instead of daily.
 */
describe("twice_daily forecast", () => {
  /**
   * Create a mock hass instance with only twice_daily and hourly forecast support.
   * Simulates weather providers like NWS that don't provide daily forecasts.
   */
  const mockHassInstance = new MockHass();
  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  // Override supported_features to include FORECAST_TWICE_DAILY (4) and FORECAST_HOURLY (2)
  // but NOT FORECAST_DAILY (1)
  hass.states["weather.demo"].attributes.supported_features =
    WeatherEntityFeature.FORECAST_TWICE_DAILY |
    WeatherEntityFeature.FORECAST_HOURLY;

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

    it("should render card with twice_daily forecast as daily fallback", async () => {
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render forecast items from twice_daily data", async () => {
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

    it("should populate daily forecast data from twice_daily subscription", async () => {
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBeGreaterThan(0);
    });

    it("should have twice_daily as current forecast type", async () => {
      // The forecast type should be "twice_daily" to correctly identify the data type
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("twice_daily");
    });

    it("should still support toggling to hourly", async () => {
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("twice_daily");

      // @ts-expect-error: accessing private method
      card._toggleForecastView();

      await card.updateComplete;

      // Should switch to hourly since it's supported
      // @ts-expect-error: accessing private property
      expect(card._currentForecastType).toBe("hourly");
    });

    it("should have is_daytime property in forecast entries", async () => {
      // twice_daily forecasts should include is_daytime to distinguish day/night
      // @ts-expect-error: accessing private property
      const forecastData = card._dailyForecastData;
      expect(forecastData).toBeDefined();

      // Check that some entries have is_daytime property
      const hasIsDaytime = forecastData?.some(
        (entry) => entry.is_daytime !== undefined
      );
      expect(hasIsDaytime).toBe(true);
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

    it("should render card with twice_daily forecast in chart mode", async () => {
      expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
    });

    it("should render chart container", async () => {
      const chartContainer =
        card.shadowRoot?.querySelector("wfc-forecast-chart");
      expect(chartContainer).not.toBeNull();
    });

    it("should render chart canvas with twice_daily data", async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const chartComponent =
        card.shadowRoot?.querySelector("wfc-forecast-chart");
      expect(chartComponent).not.toBeNull();

      const canvas = chartComponent?.shadowRoot?.querySelector("canvas");
      expect(canvas).not.toBeNull();
    });
  });
});

/**
 * Tests for weather entities that only support twice_daily (no hourly).
 * This is the most restrictive case.
 */
describe("twice_daily only forecast", () => {
  const mockHassInstance = new MockHass();
  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  // Only twice_daily support
  hass.states["weather.demo"].attributes.supported_features =
    WeatherEntityFeature.FORECAST_TWICE_DAILY;

  // Clear hourly forecast to ensure it's not used
  mockHassInstance.hourlyForecast = [];

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
    card.setConfig(testConfig);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  it("should render forecast with only twice_daily support", async () => {
    expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();

    // @ts-expect-error: accessing private property
    expect(card._dailyForecastData).toBeDefined();
    // @ts-expect-error: accessing private property
    expect(card._dailyForecastData?.length).toBeGreaterThan(0);
  });

  it("should not have hourly forecast data", async () => {
    // @ts-expect-error: accessing private property
    expect(card._hourlyForecastData).toBeUndefined();
  });

  it("should not toggle when hourly is not available", async () => {
    // @ts-expect-error: accessing private property
    expect(card._currentForecastType).toBe("twice_daily");

    // Try to toggle
    // @ts-expect-error: accessing private method
    card._toggleForecastView();

    await card.updateComplete;

    // Should still be twice_daily since hourly is not available
    // @ts-expect-error: accessing private property
    expect(card._currentForecastType).toBe("twice_daily");
  });
});

/**
 * Tests for preference order: daily should be preferred over twice_daily.
 */
describe("forecast type preference", () => {
  it("should prefer daily over twice_daily when both are available", async () => {
    const mockHassInstance = new MockHass();
    const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    // Both daily and twice_daily available
    hass.states["weather.demo"].attributes.supported_features =
      WeatherEntityFeature.FORECAST_DAILY |
      WeatherEntityFeature.FORECAST_TWICE_DAILY |
      WeatherEntityFeature.FORECAST_HOURLY;

    const config: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "daily",
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

    // Should use daily, not twice_daily
    // @ts-expect-error: accessing private property
    expect(card._currentForecastType).toBe("daily");
  });
});
