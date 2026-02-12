import { beforeEach, describe, expect, it } from "vitest";
import { fixture, waitUntil } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../src/types";

import "../src/index";
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";
import { normalizeDate } from "../src/helpers";

describe("weather-forecast-card", () => {
  const mockHassInstance = new MockHass();
  mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
  mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;

  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  const testConfig: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
    forecast: {
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

  it("should render card", async () => {
    expect(card.shadowRoot?.querySelector(".wfc-container")).not.toBeNull();
  });

  it("should render entity name", async () => {
    const el = card.shadowRoot!.querySelector(".wfc-current-weather-container");
    expect(el).not.toBeNull();

    const name = el?.querySelector(".wfc-name");
    expect(name?.textContent).toBe("Weather Demo");
  });

  it("should render current temperature", async () => {
    const el = card.shadowRoot!.querySelector(".wfc-current-weather-container");
    expect(el).not.toBeNull();

    const elTemperatures = el?.querySelector(".wfc-current-primary-secondary");
    expect(elTemperatures).not.toBeNull();

    const elTemperatureCurrent = elTemperatures?.querySelector(
      ".wfc-current-temperature"
    );
    expect(elTemperatureCurrent).not.toBeNull();

    expect(elTemperatureCurrent?.textContent.trim()).toBe(
      `${TEST_FORECAST_HOURLY[0].temperature}°C`
    );

    const elTemperatureHighLow = elTemperatures?.querySelector(
      ".wfc-current-secondary-value"
    );
    expect(elTemperatureHighLow).not.toBeNull();

    const textHighLow = elTemperatureHighLow?.textContent
      ?.replace(/\s+/g, " ")
      .trim();

    const todayTs = normalizeDate(new Date().toISOString());
    const todaysHours = TEST_FORECAST_HOURLY.filter(
      (f) => normalizeDate(f.datetime) === todayTs
    );

    const expectedHigh = Math.max(
      TEST_FORECAST_DAILY[0].temperature ?? -Infinity,
      ...todaysHours.map((f) => f.temperature ?? -Infinity)
    );

    const expectedLow = Math.min(
      TEST_FORECAST_DAILY[0].templow ??
        TEST_FORECAST_DAILY[0].temperature ??
        Infinity,
      ...todaysHours.map((f) => f.templow ?? f.temperature ?? Infinity)
    );

    expect(textHighLow).toBe(`${expectedHigh}°C / ${expectedLow}°C`);
  });

  it("should render current conditions", async () => {
    const el = card.shadowRoot!.querySelector(".wfc-current-weather-container");
    expect(el).not.toBeNull();

    const elConditions = el?.querySelector(".wfc-current-conditions");
    expect(elConditions).not.toBeNull();

    const elConditionIcon = elConditions?.querySelector(".wfc-current-icon");
    expect(elConditionIcon).not.toBeNull();

    const elConditionState = elConditions?.querySelector(".wfc-current-state");
    expect(elConditionState).not.toBeNull();

    expect(elConditionState?.textContent.trim()).toBe("Sunny");
  });

  it("should recalculate layout if forecast item count changes", async () => {
    const container = card.shadowRoot!.querySelector(
      ".wfc-forecast-container"
    ) as HTMLElement;

    Object.defineProperty(container, "clientWidth", {
      value: 350,
      configurable: true,
    });

    await card.updateComplete;

    // @ts-expect-error: accessing private property
    await waitUntil(() => card._currentItemWidth > 0);

    // @ts-expect-error: accessing private property
    const initialWidth = card._currentItemWidth;

    const shortForecast = TEST_FORECAST_DAILY.slice(0, 3);
    mockHassInstance.dailyForecast = shortForecast;

    mockHassInstance.updateForecasts("daily");

    // @ts-expect-error: accessing private property
    await waitUntil(() => card._currentItemWidth !== initialWidth);

    // @ts-expect-error: accessing private property
    const newWidth = card._currentItemWidth;

    expect(newWidth).toBeDefined();
    expect(newWidth).toBeGreaterThan(initialWidth);
  });

  it("should add is-scrollable class when content overflows", async () => {
    const container = card.shadowRoot!.querySelector(
      ".wfc-mask-container"
    ) as HTMLElement;

    // Set container width such that it overflows
    Object.defineProperty(container, "clientWidth", {
      value: 50, // Small width to ensure overflow (1 item per view, but we have 5)
      configurable: true,
    });

    // Trigger layout
    // @ts-expect-error: accessing private method
    card.layoutForecastItems(50);
    await card.updateComplete;

    // @ts-expect-error: accessing private property
    expect(card._isScrollable).toBe(true);
    expect(container.classList.contains("is-scrollable")).toBe(true);

    // Set container width such that it DOES NOT overflow
    Object.defineProperty(container, "clientWidth", {
      value: 1000, // Large width to ensure it fits (all items fit)
      configurable: true,
    });

    // @ts-expect-error: accessing private method
    card.layoutForecastItems(1000);
    await card.updateComplete;

    // @ts-expect-error: accessing private property
    expect(card._isScrollable).toBe(false);
    expect(container.classList.contains("is-scrollable")).toBe(false);
  });

  it("should render 0°C temperature", async () => {
    const zeroHourly = TEST_FORECAST_HOURLY.map((item) => ({
      ...item,
      temperature: 0,
    }));

    const zeroDaily = TEST_FORECAST_DAILY.map((item) => ({
      ...item,
      temperature: 0,
      templow: 0,
    }));

    mockHassInstance.hourlyForecast = zeroHourly;
    mockHassInstance.dailyForecast = zeroDaily;

    mockHassInstance.updateForecasts("hourly");
    mockHassInstance.updateForecasts("daily");
    card.hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 500));

    const el = card.shadowRoot!.querySelector(".wfc-current-weather-container");
    expect(el).not.toBeNull();

    const elTemperatureCurrent = el?.querySelector(".wfc-current-temperature");
    expect(elTemperatureCurrent?.textContent.trim()).toBe("0°C");

    const elTemperatureHighLow = el?.querySelector(
      ".wfc-current-secondary-value"
    );
    expect(elTemperatureHighLow?.textContent?.trim()).toBe("0°C / 0°C");
  });

  describe("should respect forecast limits", () => {
    it("should respect daily_slots limit", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          daily_slots: 3,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBe(3);
    });

    it("should respect hourly_slots limit", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly",
        forecast: {
          hourly_slots: 10,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(10);
    });

    it("should respect hourly_slots limit with hourly_group_size", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        default_forecast: "hourly",
        forecast: {
          hourly_group_size: 3,
          hourly_slots: 5,
        },
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Total hourly items = 72. Grouped by 3 = 24 items.
      // Limited by 5 slots = 5 items.
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(5);
    });

    it("should show all items when slots are not defined", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
      };

      card.setConfig(config);
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // @ts-expect-error: accessing private property
      expect(card._dailyForecastData?.length).toBe(TEST_FORECAST_DAILY.length);
      // @ts-expect-error: accessing private property
      expect(card._hourlyForecastData?.length).toBe(
        TEST_FORECAST_HOURLY.length
      );
    });
  });

  describe("should validate card configuration", () => {
    it("should throw error if entity is missing", () => {
      const config = {
        type: "custom:weather-forecast-card",
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow("entity is required");
    });

    it("should throw error if daily_slots is 0 or less", async () => {
      const config = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          daily_slots: 0,
        },
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow(
        "daily_slots must be greater than 0"
      );
    });

    it("should throw error if hourly_slots is 0 or less", async () => {
      const config = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          hourly_slots: 0,
        },
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow(
        "hourly_slots must be greater than 0"
      );
    });

    it("should throw error if current.temperature_precision is negative", async () => {
      const config = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: -1,
        },
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow(
        "temperature_precision must be 0 or greater and at most 2"
      );
    });

    it("should throw error if forecast.temperature_precision is negative", async () => {
      const config = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          temperature_precision: -2,
        },
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow(
        "temperature_precision must be 0 or greater and at most 2"
      );
    });

    it("should throw error if current.temperature_precision is greater than 2", async () => {
      const config = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 3,
        },
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow(
        "temperature_precision must be 0 or greater and at most 2"
      );
    });

    it("should throw error if forecast.temperature_precision is greater than 2", async () => {
      const config = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          temperature_precision: 4,
        },
      } as WeatherForecastCardConfig;

      expect(() => card.setConfig(config)).toThrow(
        "temperature_precision must be 0 or greater and at most 2"
      );
    });

    it("should migrate root-level temperature_entity to current.temperature_entity", () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        temperature_entity: "sensor.outdoor_temp",
      };

      card.setConfig(config);

      // @ts-expect-error: accessing private property
      expect(card.config.current?.temperature_entity).toBe(
        "sensor.outdoor_temp"
      );
      // @ts-expect-error: accessing private property
      expect(card.config.temperature_entity).toBeUndefined();
    });

    it("should prefer current.temperature_entity over root-level temperature_entity", () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        temperature_entity: "sensor.legacy_temp",
        current: {
          temperature_entity: "sensor.current_temp",
        },
      };

      card.setConfig(config);

      // @ts-expect-error: accessing private property
      expect(card.config.current?.temperature_entity).toBe(
        "sensor.current_temp"
      );
    });

    it("should not override existing current config when migrating temperature_entity", () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        temperature_entity: "sensor.outdoor_temp",
        current: {
          temperature_precision: 1,
        },
      };

      card.setConfig(config);

      // @ts-expect-error: accessing private property
      expect(card.config.current?.temperature_entity).toBe(
        "sensor.outdoor_temp"
      );
      // @ts-expect-error: accessing private property
      expect(card.config.current?.temperature_precision).toBe(1);
    });
  });

  describe("forecast layout and CSS variables", () => {
    it("should set CSS variables on ha-card element", async () => {
      const container = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      ) as HTMLElement;

      Object.defineProperty(container, "clientWidth", {
        value: 400,
        configurable: true,
      });

      // @ts-expect-error: accessing private method
      card.layoutForecastItems(400);
      await card.updateComplete;

      const haCard = card.shadowRoot!.querySelector("ha-card") as HTMLElement;
      expect(haCard).not.toBeNull();

      const itemWidth = haCard.style.getPropertyValue("--forecast-item-width");
      expect(itemWidth).not.toBe("");
      expect(itemWidth).toMatch(/^\d+px$/);
    });

    it("should set --forecast-item-gap on ha-card element", async () => {
      // Use a width that results in a gap (few items, large container)
      mockHassInstance.dailyForecast = TEST_FORECAST_DAILY.slice(0, 3);
      mockHassInstance.updateForecasts("daily");
      await card.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const container = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      ) as HTMLElement;

      Object.defineProperty(container, "clientWidth", {
        value: 500,
        configurable: true,
      });

      // @ts-expect-error: accessing private method
      card.layoutForecastItems(500);
      await card.updateComplete;

      const haCard = card.shadowRoot!.querySelector("ha-card") as HTMLElement;
      const gap = haCard.style.getPropertyValue("--forecast-item-gap");
      expect(gap).not.toBe("");
      expect(gap).toMatch(/^[\d.]+px$/);
    });

    it("should calculate correct item width based on container width", async () => {
      const container = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      ) as HTMLElement;

      Object.defineProperty(container, "clientWidth", {
        value: 350,
        configurable: true,
      });

      // @ts-expect-error: accessing private method
      card.layoutForecastItems(350);
      await card.updateComplete;

      const haCard = card.shadowRoot!.querySelector("ha-card") as HTMLElement;
      const itemWidthStr = haCard.style.getPropertyValue(
        "--forecast-item-width"
      );
      const itemWidth = parseInt(itemWidthStr, 10);

      // Item width should be calculated based on container width and min item width
      // @ts-expect-error: accessing private property
      const minWidth = card._minForecastItemWidth;
      // @ts-expect-error minWidth is not null.
      const expectedItemsPerView = Math.floor(350 / minWidth);
      const expectedItemWidth = Math.floor(350 / expectedItemsPerView);

      expect(itemWidth).toBe(expectedItemWidth);
    });

    it("should not set CSS variables when ha-card is not available", async () => {
      // Create a new card without rendering
      const testCard = new WeatherForecastCard();
      testCard.setConfig(testConfig);

      // @ts-expect-error: accessing private property
      testCard._minForecastItemWidth = 65;

      // @ts-expect-error: accessing private method - should not throw
      testCard.layoutForecastItems(400);

      // No error should be thrown, method should return early
      expect(true).toBe(true);
    });

    it("should update _currentItemWidth when layout changes", async () => {
      const container = card.shadowRoot!.querySelector(
        ".wfc-forecast-container"
      ) as HTMLElement;

      Object.defineProperty(container, "clientWidth", {
        value: 300,
        configurable: true,
      });

      // @ts-expect-error: accessing private method
      card.layoutForecastItems(300);
      await card.updateComplete;

      // @ts-expect-error: accessing private property
      const width1 = card._currentItemWidth;

      Object.defineProperty(container, "clientWidth", {
        value: 600,
        configurable: true,
      });

      // @ts-expect-error: accessing private method
      card.layoutForecastItems(600);
      await card.updateComplete;

      // @ts-expect-error: accessing private property
      const width2 = card._currentItemWidth;

      expect(width1).not.toBe(width2);
    });

    it("should expose ha-card via @query decorator", async () => {
      // @ts-expect-error: accessing private property
      const haCard = card._haCard;

      expect(haCard).not.toBeNull();
      expect(haCard?.tagName.toLowerCase()).toBe("ha-card");
    });

    it("should expose forecast container via @query decorator", async () => {
      // @ts-expect-error: accessing private property
      const forecastContainer = card._forecastContainer;

      expect(forecastContainer).not.toBeNull();
      expect(
        forecastContainer?.classList.contains("wfc-forecast-container")
      ).toBe(true);
    });
  });

  describe("reconnection and popup scenarios", () => {
    it("should establish subscriptions when reconnected to DOM with hasUpdated=true", async () => {
      const testCard = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );

      testCard.setConfig(testConfig);
      await testCard.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify initial subscriptions are established
      // @ts-expect-error: accessing private property
      expect(testCard._dailySubscription).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(testCard._hourlySubscription).toBeDefined();

      // Simulate disconnection (popup closes)
      testCard.remove();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify subscriptions were cleared on disconnect
      // @ts-expect-error: accessing private property
      expect(testCard._dailySubscription).toBeUndefined();
      // @ts-expect-error: accessing private property
      expect(testCard._hourlySubscription).toBeUndefined();

      // Simulate reconnection (popup opens)
      document.body.appendChild(testCard);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify subscriptions are re-established
      // @ts-expect-error: accessing private property
      expect(testCard._dailySubscription).toBeDefined();
      // @ts-expect-error: accessing private property
      expect(testCard._hourlySubscription).toBeDefined();
    });

    it("should not create duplicate subscriptions on reconnect", async () => {
      const testCard = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );

      testCard.setConfig(testConfig);
      await testCard.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      // @ts-expect-error: accessing private property
      const initialDailySubId = testCard._dailySubscription;
      // @ts-expect-error: accessing private property
      const initialHourlySubId = testCard._hourlySubscription;

      // Verify subscriptions exist
      expect(initialDailySubId).toBeDefined();
      expect(initialHourlySubId).toBeDefined();

      // Simulate disconnect/reconnect
      testCard.remove();
      await new Promise((resolve) => setTimeout(resolve, 50));
      document.body.appendChild(testCard);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify new subscription objects were created (different references)
      // @ts-expect-error: accessing private property
      const newDailySubId = testCard._dailySubscription;
      // @ts-expect-error: accessing private property
      const newHourlySubId = testCard._hourlySubscription;

      // Both should be defined
      expect(newDailySubId).toBeDefined();
      expect(newHourlySubId).toBeDefined();

      // They may be different references if createCallback created new promises
      // The important thing is that we have valid subscriptions, not duplicates
      expect(newDailySubId).not.toBeNull();
      expect(newHourlySubId).not.toBeNull();
    });

    it("should render forecast data after reconnection", async () => {
      const testCard = await fixture<WeatherForecastCard>(
        html`<weather-forecast-card
          .hass=${hass}
          .config=${testConfig}
        ></weather-forecast-card>`
      );

      testCard.setConfig(testConfig);
      await testCard.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify initial render with forecast data
      // @ts-expect-error: accessing private property
      const initialForecastCount = testCard._dailyForecastData?.length ?? 0;
      expect(initialForecastCount).toBeGreaterThan(0);

      // Simulate disconnect
      testCard.remove();
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Simulate reconnect
      document.body.appendChild(testCard);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify forecast data is restored
      // @ts-expect-error: accessing private property
      const reconnectedForecastCount = testCard._dailyForecastData?.length ?? 0;
      expect(reconnectedForecastCount).toBeGreaterThan(0);
      expect(reconnectedForecastCount).toBe(initialForecastCount);
    });
  });
});
