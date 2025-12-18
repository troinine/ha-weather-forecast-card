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
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";
import { formatDay, formatHour } from "../src/helpers";

import "../src/index";

describe("weather-forecast-card simple", () => {
  const mockHassInstance = new MockHass();
  mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
  mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;

  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  const testConfig: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
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

  it("should render correct indicator labels", async () => {
    expect(
      card.shadowRoot!.querySelector(".wfc-forecast-container")
    ).not.toBeNull();

    const forecastItems =
      card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_DAILY.length);

    forecastItems.forEach((item, index) => {
      const timeLabel = item.querySelector(".wfc-forecast-slot-time");
      expect(timeLabel).not.toBeNull();
      expect(timeLabel?.textContent?.trim()).toBe(
        formatDay(hass, TEST_FORECAST_DAILY[index].datetime)
      );
    });
  });

  it("should render daily forecast temperatures (high/low)", async () => {
    expect(
      card.shadowRoot!.querySelector(".wfc-forecast-container")
    ).not.toBeNull();

    const forecastItems =
      card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_DAILY.length);

    forecastItems.forEach((item, index) => {
      const temperatureHigh = item.querySelector(
        "span.wfc-forecast-temperature-high"
      );
      expect(temperatureHigh?.textContent?.trim()).toBe(
        `${TEST_FORECAST_DAILY[index].temperature}°`
      );

      const temperatureLow = item.querySelector(
        "span.wfc-forecast-temperature-low"
      );
      expect(temperatureLow?.textContent?.trim()).toBe(
        `/${TEST_FORECAST_DAILY[index].templow}°`
      );
    });
  });

  it("should render daily forecast conditions as image with condition", async () => {
    expect(
      card.shadowRoot!.querySelector(".wfc-forecast-container")
    ).not.toBeNull();

    const forecastItems =
      card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_DAILY.length);

    for (const [index, item] of forecastItems.entries()) {
      const iconSlot = item.querySelector(".wfc-weather-condition-icon-slot");
      expect(iconSlot).not.toBeNull();

      expect(iconSlot?.getAttribute("data-condition")).toBe(
        TEST_FORECAST_DAILY[index].condition
      );

      const icon = iconSlot?.querySelector("svg");
      expect(icon).not.toBeNull();
    }
  });

  it("should toggle to hourly on tap and render hourly forecast", async () => {
    const forecastContainer = card.shadowRoot!.querySelector(
      ".wfc-forecast-container"
    );
    expect(forecastContainer).not.toBeNull();

    forecastContainer?.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })
    );

    await card.updateComplete;

    await new Promise((resolve) => setTimeout(resolve, 150));

    const forecastItems =
      card.shadowRoot!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_HOURLY.length);

    forecastItems.forEach((item, index) => {
      const timeLabel = item.querySelector(".wfc-forecast-slot-time");
      expect(timeLabel).not.toBeNull();
      expect(timeLabel?.textContent?.trim()).toBe(
        formatHour(hass, TEST_FORECAST_HOURLY[index].datetime)
      );

      const temperatureHigh = item.querySelector(
        "span.wfc-forecast-temperature-high"
      );
      expect(temperatureHigh?.textContent?.trim()).toBe(
        `${TEST_FORECAST_HOURLY[index].temperature}°`
      );

      expect(
        item.querySelector("span.wfc-forecast-temperature-low")
      ).toBeNull();
    });
  });
});
