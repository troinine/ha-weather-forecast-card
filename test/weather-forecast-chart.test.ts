import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("should respect styles configured in CSS", async () => {
    const chartElement = card.shadowRoot!.querySelector(
      "wfc-forecast-chart"
    ) as WfcForecastChart;
    expect(chartElement).not.toBeNull();

    const testColors = {
      grid: "rgb(1, 1, 1)",
      highTempLabel: "rgb(2, 2, 2)",
      lowTempLabel: "rgb(3, 3, 3)",
      precipLabel: "rgb(4, 4, 4)",
      highLine: "rgb(5, 5, 5)",
      lowLine: "rgb(6, 6, 6)",
      precipBar: "rgb(7, 7, 7)",
    };

    chartElement.style.setProperty("--wfc-chart-grid-color", testColors.grid);
    chartElement.style.setProperty(
      "--wfc-chart-temp-high-label-color",
      testColors.highTempLabel
    );
    chartElement.style.setProperty(
      "--wfc-chart-temp-low-label-color",
      testColors.lowTempLabel
    );
    chartElement.style.setProperty(
      "--wfc-chart-precipitation-label-color",
      testColors.precipLabel
    );
    chartElement.style.setProperty(
      "--wfc-chart-temp-high-line-color",
      testColors.highLine
    );
    chartElement.style.setProperty(
      "--wfc-chart-temp-low-line-color",
      testColors.lowLine
    );
    chartElement.style.setProperty(
      "--wfc-precipitation-bar-color",
      testColors.precipBar
    );

    // Manually set itemWidth to trigger rendering
    chartElement.itemWidth = 100;
    await chartElement.updateComplete;

    // @ts-expect-error: _chart is private
    const chartInstance = chartElement._chart;
    expect(chartInstance).toBeDefined();

    const datasets = chartInstance!.data.datasets;

    expect(datasets[0].borderColor).toBe(testColors.highLine);
    // @ts-expect-error: datalabels type def missing in chartjs types
    expect(datasets[0].datalabels.color).toBe(testColors.highTempLabel);
    expect(datasets[1].borderColor).toBe(testColors.lowLine);
    // @ts-expect-error: datalabels type def missing in chartjs types
    expect(datasets[1].datalabels.color).toBe(testColors.lowTempLabel);
    expect(datasets[2].backgroundColor).toBe(testColors.precipBar);
    // @ts-expect-error: datalabels type def missing in chartjs types
    expect(datasets[2].datalabels.color).toBe(testColors.precipLabel);
    const options = chartInstance!.options;
    // @ts-expect-error: deep access
    expect(options.scales.x.border.color).toBe(testColors.grid);
    // @ts-expect-error: deep access
    expect(options.scales.x.grid.color).toBe(testColors.grid);
  });

  it("should support drag-to-scroll when dragging", async () => {
    const chartComponent = card.shadowRoot!.querySelector("wfc-forecast-chart");
    expect(chartComponent).not.toBeNull();

    const scrollContainer = chartComponent!.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement;
    expect(scrollContainer).not.toBeNull();

    expect(scrollContainer.classList.contains("is-dragging")).toBe(false);

    const mouseDownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      clientX: 250,
    });

    Object.defineProperty(mouseDownEvent, "pageX", { value: 250 });

    scrollContainer.dispatchEvent(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: 50,
    });

    Object.defineProperty(mouseMoveEvent, "pageX", { value: 50 });

    window.dispatchEvent(mouseMoveEvent);

    expect(scrollContainer.classList.contains("is-dragging")).toBe(true);
    expect(scrollContainer.classList.contains("no-snap")).toBe(true);

    const mouseUpEvent = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
    });

    // Mock dimensions to ensure snapping logic sees a width
    const scrollSlot = scrollContainer.querySelector(".wfc-forecast-slot");
    if (scrollSlot) {
      vi.spyOn(scrollSlot, "getBoundingClientRect").mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
    }

    window.dispatchEvent(mouseUpEvent);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(scrollContainer.classList.contains("is-dragging")).toBe(false);

    expect(scrollContainer.scrollLeft).toBeGreaterThan(0);
  });
});
