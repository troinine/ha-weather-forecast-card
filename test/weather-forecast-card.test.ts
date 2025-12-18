import { beforeEach, describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
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
});
