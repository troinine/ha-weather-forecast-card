import { beforeEach, describe, expect, it } from "vitest";
import { fixture, waitUntil } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../src/types";

import "../src/index";
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";

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

    const elTemperatures = el?.querySelector(".wfc-current-temperatures");
    expect(elTemperatures).not.toBeNull();

    const elTemperatureCurrent = elTemperatures?.querySelector(
      ".wfc-current-temperature"
    );
    expect(elTemperatureCurrent).not.toBeNull();

    expect(elTemperatureCurrent?.textContent.trim()).toBe(
      `${TEST_FORECAST_HOURLY[0].temperature}°C`
    );

    const elTemperatureHighLow = elTemperatures?.querySelector(
      ".wfc-current-temperature-high-low"
    );
    expect(elTemperatureHighLow).not.toBeNull();

    const textHighLow = elTemperatureHighLow?.textContent
      ?.replace(/\s+/g, " ")
      .trim();

    expect(textHighLow).toBe(
      `${TEST_FORECAST_DAILY[0].temperature}°C / ${TEST_FORECAST_DAILY[0].templow}°C`
    );
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

  it("should render 0°C temperature", async () => {
    const zeroHourly = [...TEST_FORECAST_HOURLY];
    zeroHourly[0] = { ...zeroHourly[0], temperature: 0 };

    const zeroDaily = [...TEST_FORECAST_DAILY];
    zeroDaily[0] = { ...zeroDaily[0], temperature: 0, templow: 0 };

    mockHassInstance.hourlyForecast = zeroHourly;
    mockHassInstance.dailyForecast = zeroDaily;

    mockHassInstance.updateForecasts("hourly");
    mockHassInstance.updateForecasts("daily");

    card.hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 200));

    const el = card.shadowRoot!.querySelector(".wfc-current-weather-container");
    expect(el).not.toBeNull();

    const elTemperatureCurrent = el?.querySelector(".wfc-current-temperature");
    expect(elTemperatureCurrent?.textContent.trim()).toBe("0°C");

    const elTemperatureHighLow = el?.querySelector(
      ".wfc-current-temperature-high-low"
    );
    expect(elTemperatureHighLow?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "0°C / 0°C"
    );
  });
});
