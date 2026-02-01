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
import { formatDay, formatHourParts } from "../src/helpers";
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";
import { WfcForecastChart } from "../src/components/wfc-forecast-chart";
import { merge } from "lodash-es";
import { Chart } from "chart.js";
import { createWeatherForecastCardTestFixture } from "./test-utils";

import "../src/index";

describe("weather-forecast-card chart", () => {
  const mockHassInstance = new MockHass();
  mockHassInstance.dailyForecast = TEST_FORECAST_DAILY;
  mockHassInstance.hourlyForecast = TEST_FORECAST_HOURLY;
  let hass = mockHassInstance.getHass() as ExtendedHomeAssistant;

  const mockGradient = {
    addColorStop: vi.fn(),
  };

  /**
   * Factory function to create a testable card instance.
   */
  const createCardFixture = async (
    configOverrides?: Partial<WeatherForecastCardConfig>,
    styleOverrides?: Record<string, string>
  ): Promise<{ card: WeatherForecastCard; chart: Chart }> => {
    const config: WeatherForecastCardConfig = merge(
      {},
      {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          mode: ForecastMode.Chart,
          show_sun_times: false,
        },
      },
      configOverrides
    );

    const styles = merge(
      {},
      {
        "--wfc-chart-grid-color": "rgb(200, 200, 200)",
        "--wfc-chart-temp-high-label-color": "rgb(255, 134, 224)",
        "--wfc-chart-temp-low-label-color": "rgb(44, 33, 235)",
        "--wfc-chart-precipitation-label-color": "rgb(0, 128, 0)",
        "--wfc-chart-temp-high-line-color": "rgb(255, 100, 100)",
        "--wfc-chart-temp-low-line-color": "rgb(100, 100, 255)",
        "--wfc-precipitation-bar-color": "rgb(100, 255, 100)",
      },
      styleOverrides
    );

    const { card, chart } = await createWeatherForecastCardTestFixture(
      hass,
      config,
      {
        chartStyles: styles,
      }
    );

    // HappyDOM doesn't do layout, so we need to mock some chart methods
    chart!.resize = vi.fn();
    chart!.update = vi.fn();

    expect(chart).not.toBeNull();
    expect(chart).toBeDefined();

    // @ts-expect-error mock
    chart.chartArea = vi.mockObject({
      left: 0,
      right: 300,
      top: 0,
      bottom: 150,
      width: 300,
      height: 150,
    });

    // @ts-expect-error mock
    chart.scales.yTemp = vi.mockObject({
      min: 0,
      max: 100,
    });

    // @ts-expect-error mock
    chart.ctx = {
      createLinearGradient: vi.fn().mockReturnValue(mockGradient),
    };

    return { card, chart: chart! };
  };

  let card: WeatherForecastCard;
  let chart: Chart;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ card, chart } = await createCardFixture());
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
        formatHourParts(hass, TEST_FORECAST_HOURLY[index].datetime).hour
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
    const testColors = {
      grid: "rgb(1, 1, 1)",
      highTempLabel: "rgb(2, 2, 2)",
      lowTempLabel: "rgb(3, 3, 3)",
      precipLabel: "rgb(4, 4, 4)",
      highLine: "rgb(5, 5, 5)",
      lowLine: "rgb(6, 6, 6)",
      precipBar: "rgb(7, 7, 7)",
    };

    const styles = {
      "--wfc-chart-grid-color": testColors.grid,
      "--wfc-chart-temp-high-label-color": testColors.highTempLabel,
      "--wfc-chart-temp-low-label-color": testColors.lowTempLabel,
      "--wfc-chart-precipitation-label-color": testColors.precipLabel,
      "--wfc-chart-temp-high-line-color": testColors.highLine,
      "--wfc-chart-temp-low-line-color": testColors.lowLine,
      "--wfc-precipitation-bar-color": testColors.precipBar,
    };

    const { chart } = await createCardFixture({}, styles);

    const datasets = chart.data.datasets;

    // @ts-expect-error: borderColor is a function
    expect(datasets[0].borderColor({ chart })).toBe(testColors.highLine);

    expect(
      // @ts-expect-error: borderColor is a function
      datasets[1].borderColor({ chart, datasetIndex: 1 })
    ).toBe(testColors.lowLine);

    // borderColor is now a function (for gradient support), not a direct color
    expect(typeof datasets[0].borderColor).toBe("function");
    // @ts-expect-error: datalabels type def missing in chartjs types
    expect(datasets[0].datalabels.color).toBe(testColors.highTempLabel);
    expect(typeof datasets[1].borderColor).toBe("function");
    // @ts-expect-error: datalabels type def missing in chartjs types
    expect(datasets[1].datalabels.color).toBe(testColors.lowTempLabel);
    expect(datasets[2].backgroundColor).toBe(testColors.precipBar);
    // @ts-expect-error: datalabels type def missing in chartjs types
    expect(datasets[2].datalabels.color).toBe(testColors.precipLabel);
    const options = chart.options;
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

  it("should use non-dashed line for low temperature by default", async () => {
    const datasets = chart.data.datasets;
    // @ts-expect-error: borderDash is defined
    expect(datasets[0].borderDash).toBeUndefined();
    // @ts-expect-error: borderDash is defined
    expect(datasets[1].borderDash).toBeUndefined();
  });

  describe("temperature color thresholds", () => {
    it("should use default colors when use_color_thresholds is disabled", async () => {
      const styles = {
        "--wfc-chart-temp-high-line-color": "rgb(255, 0, 0)",
        "--wfc-chart-temp-low-line-color": "rgb(0, 0, 255)",
      };

      const { chart } = await createCardFixture(
        {
          forecast: { mode: ForecastMode.Chart, use_color_thresholds: false },
        },
        styles
      );

      const datasets = chart.data.datasets;
      const mockContext = { chart };

      // @ts-expect-error: borderColor is a function
      const highColor = datasets[0].borderColor(mockContext);

      // @ts-expect-error: borderColor is a function
      const lowColor = datasets[1].borderColor({
        ...mockContext,
        datasetIndex: 1,
      });

      expect(highColor).toBe("rgb(255, 0, 0)");
      expect(lowColor).toBe("rgb(0, 0, 255)");
    });

    it("should apply gradient when use_color_thresholds is enabled", async () => {
      const { chart } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, use_color_thresholds: true },
      });

      const datasets = chart.data.datasets;
      const mockContext = { chart };

      // @ts-expect-error: borderColor is a function
      const gradient = datasets[0].borderColor(mockContext);

      expect(gradient).toBeTruthy();

      expect(mockGradient.addColorStop).toHaveBeenCalled();

      expect(mockGradient.addColorStop).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining("ff")
      );

      expect(gradient).toBe(mockGradient);
    });

    it("should respect custom temperature color CSS variables", async () => {
      const customThresholdStyles = {
        "--wfc-temp-cold": "#0000ff",
        "--wfc-temp-freezing": "#00ffff",
        "--wfc-temp-chilly": "#ffff00",
        "--wfc-temp-mild": "#00ff00",
        "--wfc-temp-warm": "#ff9900",
        "--wfc-temp-hot": "#ff0000",
      };

      const { chart } = await createCardFixture(
        {
          forecast: { mode: ForecastMode.Chart, use_color_thresholds: true },
        },
        customThresholdStyles
      );

      const datasets = chart.data.datasets;
      const mockContext = { chart };

      // @ts-expect-error: borderColor is a function
      const gradient = datasets[0].borderColor(mockContext);

      expect(gradient).toBeTruthy();

      expect(mockGradient.addColorStop).toHaveBeenCalled();

      Object.values(customThresholdStyles).forEach((element) => {
        expect(mockGradient.addColorStop).toHaveBeenCalledWith(
          expect.any(Number),
          expect.stringContaining(element)
        );
      });

      expect(gradient).toBe(mockGradient);
    });

    it("should apply gradient to both temperature lines when enabled", async () => {
      const { chart } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, use_color_thresholds: true },
      });

      const datasets = chart.data.datasets;
      const mockContext = { chart };

      // Check high temp line
      // @ts-expect-error: borderColor is a function
      expect(datasets[0].borderColor(mockContext)).toBeTruthy();
      // @ts-expect-error: pointBackgroundColor is a function
      expect(datasets[0].pointBackgroundColor(mockContext)).toBeTruthy();

      // Check low temp line
      const lowContext = { ...mockContext, datasetIndex: 1 };
      // @ts-expect-error: borderColor is a function
      expect(datasets[1].borderColor(lowContext)).toBeTruthy();
      // @ts-expect-error: pointBackgroundColor is a function
      expect(datasets[1].pointBackgroundColor(lowContext)).toBeTruthy();
    });

    it("should use dashed line for low temperature", async () => {
      const { chart } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, use_color_thresholds: true },
      });

      const datasets = chart.data.datasets;

      // @ts-expect-error: borderDash is defined
      expect(datasets[0].borderDash).toBeUndefined();
      // @ts-expect-error: borderDash is defined
      expect(datasets[1].borderDash).toEqual([4, 4]);
    });

    it("should convert thresholds to Fahrenheit when unit is Fahrenheit", async () => {
      const mockHassFahrenheit = new MockHass({ unitOfMeasurement: "°F" });
      hass = mockHassFahrenheit.getHass() as ExtendedHomeAssistant;

      const { chart } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, use_color_thresholds: true },
      });

      // @ts-expect-error mock readonly
      chart.chartArea = { bottom: 100, top: 0 };
      // @ts-expect-error mock readonly
      chart.scales = {
        yTemp: { min: 0, max: 100 },
      };
      // @ts-expect-error mock readonly
      chart.ctx = {
        createLinearGradient: vi.fn().mockReturnValue(mockGradient),
      };

      const datasets = chart.data.datasets;
      // @ts-expect-error borderColor is a function
      datasets[0].borderColor({ chart });

      // 0°C should be converted to 32°F.
      // With min=0, max=100, pos should be (32-0)/100 = 0.32
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(
        0.32,
        expect.any(String)
      );

      // 18°C should be converted to 64.4°F.
      // With min=0, max=100, pos should be (64.4-0)/100 = 0.644
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(
        0.644,
        expect.any(String)
      );
    });
  });

  it("should truncate forecast to stay under MAX_CANVAS_WIDTH", async () => {
    const expectedItems = 327;
    const largeForecast = Array.from({ length: 500 }, (_, i) => ({
      datetime: new Date(Date.now() + i * 3600000).toISOString(),
      temperature: 20,
      condition: "sunny",
    }));

    const styles = {
      "--forecast-item-gap": "0px",
    };

    const card = await fixture<WeatherForecastCard>(html`
      <weather-forecast-card
        .hass=${hass}
        .config=${{
          type: "custom:weather-forecast-card",
          entity: "weather.demo",
          forecast: { mode: ForecastMode.Chart },
        }}
      ></weather-forecast-card>
    `);

    const chartElement = card.shadowRoot!.querySelector(
      "wfc-forecast-chart"
    ) as WfcForecastChart;
    chartElement.forecast = largeForecast;
    chartElement.itemWidth = 50;

    Object.entries(styles).forEach(([key, value]) => {
      chartElement.style.setProperty(key, value);
    });

    await chartElement.updateComplete;

    // MAX_CANVAS_WIDTH = 16384
    // itemWidth = 50, gap = 0
    // maxItems = floor((16384 + 0) / (50 + 0)) = 327

    // @ts-expect-error private
    const safeForecast = chartElement.safeForecast;
    expect(safeForecast.length).toBe(expectedItems);

    const header = chartElement.querySelector(".wfc-forecast-chart-header");
    const headerItems = header!.querySelectorAll(".wfc-forecast-slot");
    expect(headerItems.length).toBe(expectedItems);

    const footer = chartElement.querySelector(".wfc-forecast-chart-footer");
    const footerItems = footer!.querySelectorAll(".wfc-forecast-slot");
    expect(footerItems.length).toBe(expectedItems);

    // @ts-expect-error private
    const chartInstance = chartElement._chart;
    expect(chartInstance?.data.labels?.length).toBe(expectedItems);
  });
});
