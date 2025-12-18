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
import { formatDay, formatHour } from "../src/helpers";
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";

import "../src/index";
import { WfcForecastChart } from "../src/components/wfc-forecast-chart";

describe("weather-forecast-card chart", () => {
  const mockHassInstance = new MockHass();
  mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
  mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;

  const hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  const testConfig: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
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

  it("should render chart container and canvas", async () => {
    const chartContainer = card.shadowRoot!.querySelector(
      ".wfc-forecast-chart"
    );
    expect(chartContainer).not.toBeNull();

    const canvas = chartContainer!.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });

  it("should render daily forecast header items", async () => {
    const header = card.shadowRoot!.querySelector(".wfc-forecast-chart-header");
    expect(header).not.toBeNull();

    const forecastItems = header!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_DAILY.length);

    forecastItems.forEach((item, index) => {
      const timeLabel = item.querySelector(".wfc-forecast-slot-time");
      expect(timeLabel).not.toBeNull();
      expect(timeLabel?.textContent?.trim()).toBe(
        formatDay(hass, TEST_FORECAST_DAILY[index].datetime)
      );

      const iconProvider = item.querySelector(
        "wfc-weather-condition-icon-provider"
      );
      expect(iconProvider).not.toBeNull();
      const iconDiv = iconProvider!.querySelector(
        ".wfc-weather-condition-icon-slot"
      );
      expect(iconDiv).not.toBeNull();
      expect(iconDiv?.getAttribute("data-condition")).toBe(
        TEST_FORECAST_DAILY[index].condition
      );
    });
  });

  it("should render daily forecast footer items", async () => {
    const footer = card.shadowRoot!.querySelector(".wfc-forecast-chart-footer");
    expect(footer).not.toBeNull();

    const forecastItems = footer!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_DAILY.length);
  });

  it("should toggle to hourly on tap and render hourly forecast items", async () => {
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

    const header = card.shadowRoot!.querySelector(".wfc-forecast-chart-header");
    expect(header).not.toBeNull();

    const forecastItems = header!.querySelectorAll(".wfc-forecast-slot");
    expect(forecastItems.length).toBe(TEST_FORECAST_HOURLY.length);

    forecastItems.forEach((item, index) => {
      const timeLabel = item.querySelector(".wfc-forecast-slot-time");
      expect(timeLabel).not.toBeNull();
      expect(timeLabel?.textContent?.trim()).toBe(
        formatHour(hass, TEST_FORECAST_HOURLY[index].datetime)
      );

      const iconProvider = item.querySelector(
        "wfc-weather-condition-icon-provider"
      );
      expect(iconProvider).not.toBeNull();
      const iconDiv = iconProvider!.querySelector(
        ".wfc-weather-condition-icon-slot"
      );
      expect(iconDiv).not.toBeNull();
      expect(iconDiv?.getAttribute("data-condition")).toBe(
        TEST_FORECAST_HOURLY[index].condition
      );
    });
  });

  it("should render chart with correct data", async () => {
    const chartContainer = card.shadowRoot!.querySelector(
      ".wfc-forecast-chart"
    );
    expect(chartContainer).not.toBeNull();

    const chartElement = card.shadowRoot!.querySelector(
      "wfc-forecast-chart"
    ) as WfcForecastChart;
    expect(chartElement).not.toBeNull();

    // Manually set itemWidth to trigger rendering (HappyDOM doesn't calculate layout)
    chartElement.itemWidth = 100;
    await chartElement.updateComplete;

    // @ts-expect-error: _chart is private
    const chartInstance = chartElement._chart;
    expect(chartInstance).toBeDefined();

    // Verify datasets
    const datasets = chartInstance!.data.datasets;
    expect(datasets).toHaveLength(3); // High, Low, Precip

    // Dataset 0: High Temperature
    const highTemps = datasets[0].data;
    expect(highTemps).toHaveLength(TEST_FORECAST_DAILY.length);
    TEST_FORECAST_DAILY.forEach((day, index) => {
      expect(highTemps[index]).toBe(day.temperature);
    });

    // Dataset 1: Low Temperature
    const lowTemps = datasets[1].data;
    expect(lowTemps).toHaveLength(TEST_FORECAST_DAILY.length);
    TEST_FORECAST_DAILY.forEach((day, index) => {
      expect(lowTemps[index]).toBe(day.templow);
    });
  });
});
