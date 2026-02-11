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
    const chartElement = card.shadowRoot!.querySelector("wfc-forecast-chart");
    expect(chartElement).not.toBeNull();

    // Dispatch action event directly (actionHandler directive doesn't work in test env)
    chartElement?.dispatchEvent(
      new CustomEvent("action", {
        bubbles: true,
        composed: true,
        detail: { action: "tap" },
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

      // Hourly uses two-row layout, check primary label
      const primaryLabel = timeLabel?.querySelector(
        ".wfc-forecast-slot-time-primary"
      );
      expect(primaryLabel?.textContent?.trim()).toBe(
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

  describe("attribute selector", () => {
    const forecastWithAllAttributes = TEST_FORECAST_DAILY.map((f, i) => ({
      ...f,
      humidity: 50 + i * 5,
      pressure: 1010 + i * 2,
      uv_index: i + 1,
      apparent_temperature: f.temperature - 2,
    }));

    it("should not render attribute selector when show_attribute_selector is false", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: false },
      });

      const chartElement = card.shadowRoot!.querySelector("wfc-forecast-chart");
      expect(chartElement).not.toBeNull();

      const settingsButton = chartElement!.querySelector(
        ".wfc-settings-toggle-button"
      );
      expect(settingsButton).toBeNull();
    });

    it("should not render attribute selector when show_attribute_selector is undefined", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart },
      });

      const chartElement = card.shadowRoot!.querySelector("wfc-forecast-chart");
      expect(chartElement).not.toBeNull();

      const settingsButton = chartElement!.querySelector(
        ".wfc-settings-toggle-button"
      );
      expect(settingsButton).toBeNull();
    });

    it("should render attribute selector when show_attribute_selector is true", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector("wfc-forecast-chart");
      expect(chartElement).not.toBeNull();

      const settingsButton = chartElement!.querySelector(
        ".wfc-settings-toggle-button"
      );
      expect(settingsButton).not.toBeNull();
    });

    it("should open dropdown when settings button is clicked", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;
      expect(chartElement).not.toBeNull();

      const settingsButton = chartElement!.querySelector(
        ".wfc-settings-toggle-button"
      ) as HTMLElement;
      expect(settingsButton).not.toBeNull();

      // Initially dropdown should not be visible
      let dropdown = chartElement!.querySelector(
        "wfc-chart-attribute-selector"
      );
      expect(dropdown).not.toBeNull();
      // @ts-expect-error: open is a property
      expect(dropdown!.open).toBe(false);

      // Click to open
      settingsButton.click();
      await chartElement.updateComplete;

      dropdown = chartElement!.querySelector("wfc-chart-attribute-selector");
      // @ts-expect-error: open is a property
      expect(dropdown!.open).toBe(true);
    });

    it("should update chart when humidity attribute is selected", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // Set forecast with humidity data
      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // Simulate attribute selection
      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );
      expect(dropdown).not.toBeNull();

      dropdown!.dispatchEvent(
        new CustomEvent("selected", { detail: { value: "humidity" } })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      expect(chartInstance).not.toBeNull();

      // Verify chart has humidity data
      const datasets = chartInstance!.data.datasets;
      expect(datasets.length).toBe(1);

      // Verify the data matches humidity values
      const humidityData = datasets[0].data;
      forecastWithAllAttributes.forEach((f, i) => {
        expect(humidityData[i]).toBe(f.humidity);
      });
    });

    it("should update chart when pressure attribute is selected", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );
      dropdown!.dispatchEvent(
        new CustomEvent("selected", { detail: { value: "pressure" } })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      const datasets = chartInstance!.data.datasets;
      expect(datasets.length).toBe(1);

      const pressureData = datasets[0].data;
      forecastWithAllAttributes.forEach((f, i) => {
        expect(pressureData[i]).toBe(f.pressure);
      });
    });

    it("should update chart when uv_index attribute is selected", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );
      dropdown!.dispatchEvent(
        new CustomEvent("selected", { detail: { value: "uv_index" } })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      const datasets = chartInstance!.data.datasets;
      expect(datasets.length).toBe(1);

      // UV index uses bar chart
      expect(datasets[0].type).toBe("bar");

      const uvData = datasets[0].data;
      forecastWithAllAttributes.forEach((f, i) => {
        expect(uvData[i]).toBe(f.uv_index);
      });
    });

    it("should update chart when apparent_temperature attribute is selected", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );
      dropdown!.dispatchEvent(
        new CustomEvent("selected", {
          detail: { value: "apparent_temperature" },
        })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      const datasets = chartInstance!.data.datasets;
      expect(datasets.length).toBe(1);

      const apparentTempData = datasets[0].data;
      forecastWithAllAttributes.forEach((f, i) => {
        expect(apparentTempData[i]).toBe(f.apparent_temperature);
      });
    });

    it("should switch back to temperature_and_precipitation", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );

      // First switch to humidity
      dropdown!.dispatchEvent(
        new CustomEvent("selected", { detail: { value: "humidity" } })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      let chartInstance = chartElement._chart;
      expect(chartInstance!.data.datasets.length).toBe(1);

      // Switch back to default
      dropdown!.dispatchEvent(
        new CustomEvent("selected", {
          detail: { value: "temperature_and_precipitation" },
        })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      chartInstance = chartElement._chart;
      // Default view has 3 datasets: high temp, low temp, precipitation
      expect(chartInstance!.data.datasets.length).toBe(3);
    });

    it("should only show attributes that have data in forecast", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // Set forecast without uv_index data
      const forecastWithoutUV = TEST_FORECAST_DAILY.map((f) => ({
        ...f,
        humidity: 50,
        pressure: 1013,
        // uv_index intentionally omitted
      }));
      chartElement.forecast = forecastWithoutUV;
      await chartElement.updateComplete;

      // @ts-expect-error: _getChartOptions is private
      const options = chartElement._getChartOptions();

      // Should include temperature_and_precipitation, humidity, pressure
      // but not uv_index since it's not in the forecast data
      const optionValues = options.map((o: { value: string }) => o.value);
      expect(optionValues).toContain("temperature_and_precipitation");
      expect(optionValues).toContain("humidity");
      expect(optionValues).toContain("pressure");
      expect(optionValues).not.toContain("uv_index");
    });

    it("should close dropdown when closed event is fired", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart, show_attribute_selector: true },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      const settingsButton = chartElement!.querySelector(
        ".wfc-settings-toggle-button"
      ) as HTMLElement;

      // Open dropdown
      settingsButton.click();
      await chartElement.updateComplete;

      const dropdown = chartElement!.querySelector(
        "wfc-chart-attribute-selector"
      );
      // @ts-expect-error: open is a property
      expect(dropdown!.open).toBe(true);

      // Fire closed event
      dropdown!.dispatchEvent(new CustomEvent("closed"));
      await chartElement.updateComplete;

      // @ts-expect-error: open is a property
      expect(dropdown!.open).toBe(false);
    });

    it("should use bar dataset type for uv_index", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          show_attribute_selector: true,
          default_chart_attribute: "uv_index",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      // UV index uses bar type in the dataset
      expect(chartInstance!.data.datasets[0].type).toBe("bar");
    });

    it("should use line dataset type for humidity", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          show_attribute_selector: true,
          default_chart_attribute: "humidity",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      // Line charts don't set explicit type on datasets (uses chart's default)
      expect(chartInstance!.data.datasets[0].type).toBeUndefined();
    });

    it("should use mixed dataset types for temperature_and_precipitation", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          show_attribute_selector: true,
          default_chart_attribute: "temperature_and_precipitation",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      // Default view has 3 datasets: high temp (line), low temp (line), precipitation (bar)
      expect(chartInstance!.data.datasets.length).toBe(3);
      expect(chartInstance!.data.datasets[2].type).toBe("bar"); // Precipitation is bar
    });

    it("should use temperature_and_precipitation as default when default_chart_attribute is not set", async () => {
      const { card } = await createCardFixture({
        forecast: { mode: ForecastMode.Chart },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _selectedAttribute is private
      expect(chartElement._selectedAttribute).toBe(
        "temperature_and_precipitation"
      );

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      // Default view has 3 datasets: high temp, low temp, precipitation
      expect(chartInstance!.data.datasets.length).toBe(3);
    });

    it("should use configured default_chart_attribute on initial render", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          default_chart_attribute: "humidity",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _selectedAttribute is private
      expect(chartElement._selectedAttribute).toBe("humidity");

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      // Humidity uses single dataset
      expect(chartInstance!.data.datasets.length).toBe(1);

      const humidityData = chartInstance!.data.datasets[0].data;
      forecastWithAllAttributes.forEach((f, i) => {
        expect(humidityData[i]).toBe(f.humidity);
      });
    });

    it("should use configured default_chart_attribute for uv_index", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          default_chart_attribute: "uv_index",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _selectedAttribute is private
      expect(chartElement._selectedAttribute).toBe("uv_index");

      // @ts-expect-error: _chart is private
      const chartInstance = chartElement._chart;
      // UV index uses bar chart
      expect(chartInstance!.data.datasets[0].type).toBe("bar");
    });

    it("should update chart root type when switching from uv_index to temperature_and_precipitation", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          show_attribute_selector: true,
          default_chart_attribute: "uv_index",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      let chartInstance = chartElement._chart;
      // Initially UV index uses bar chart type
      expect(chartInstance!.config.type).toBe("bar");

      // Switch to temperature_and_precipitation
      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );
      dropdown!.dispatchEvent(
        new CustomEvent("selected", {
          detail: { value: "temperature_and_precipitation" },
        })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      chartInstance = chartElement._chart;
      // After switching, chart should be line type, not bar
      expect(chartInstance!.config.type).toBe("line");
      expect(chartInstance!.data.datasets.length).toBe(3);
    });

    it("should update chart root type when switching from temperature_and_precipitation to uv_index", async () => {
      const { card } = await createCardFixture({
        forecast: {
          mode: ForecastMode.Chart,
          show_attribute_selector: true,
          default_chart_attribute: "temperature_and_precipitation",
        },
      });

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      chartElement.forecast = forecastWithAllAttributes;
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      let chartInstance = chartElement._chart;
      // Initially temperature_and_precipitation uses line chart type
      expect(chartInstance!.config.type).toBe("line");

      // Switch to uv_index
      const dropdown = chartElement.querySelector(
        "wfc-chart-attribute-selector"
      );
      dropdown!.dispatchEvent(
        new CustomEvent("selected", {
          detail: { value: "uv_index" },
        })
      );
      await chartElement.updateComplete;

      // @ts-expect-error: _chart is private
      chartInstance = chartElement._chart;
      // After switching, chart should be bar type
      expect(chartInstance!.config.type).toBe("bar");
      expect(chartInstance!.data.datasets.length).toBe(1);
    });
  });

  describe("chart font size", () => {
    it("should use default font size of 12 when CSS variable is not set", async () => {
      const { card } = await createCardFixture();

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // @ts-expect-error: _getChartFontSize is private
      const fontSize = chartElement._getChartFontSize();
      expect(fontSize).toBe(12);
    });

    it("should use custom font size from CSS variable", async () => {
      const { card } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // @ts-expect-error: _getChartFontSize is private
      const fontSize = chartElement._getChartFontSize();
      expect(fontSize).toBe(16);
    });

    it("should parse font size with px suffix", async () => {
      const { card } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "14px" }
      );

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // @ts-expect-error: _getChartFontSize is private
      const fontSize = chartElement._getChartFontSize();
      expect(fontSize).toBe(14);
    });

    it("should apply font size to chart datalabels", async () => {
      const { chart } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );

      const pluginOptions = chart.options.plugins?.datalabels;
      expect(pluginOptions?.font?.size).toBe(16);
    });

    it("should scale bottom padding with font size", async () => {
      // Default font size 12 should have bottom padding 10
      const { chart: defaultChart } = await createCardFixture();
      // @ts-expect-error: layout type
      expect(defaultChart.options.layout?.padding?.bottom).toBe(10);

      // Font size 16 should have bottom padding 14 (10 + (16 - 12))
      const { chart: largerChart } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );
      // @ts-expect-error: layout type
      expect(largerChart.options.layout?.padding?.bottom).toBe(14);
    });

    it("should keep top padding fixed at 10 regardless of font size", async () => {
      const { chart: defaultChart } = await createCardFixture();
      // @ts-expect-error: layout type
      expect(defaultChart.options.layout?.padding?.top).toBe(10);

      const { chart: largerChart } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );
      // @ts-expect-error: layout type
      expect(largerChart.options.layout?.padding?.top).toBe(10);
    });

    it("should scale bar label offset with font size", async () => {
      const { card } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // @ts-expect-error: _getBarLabelOffset is private
      const offset = chartElement._getBarLabelOffset();
      // Base offset -22 at font size 12, so at font size 16: -22 - (16 - 12) = -26
      expect(offset).toBe(-26);
    });

    it("should use default bar label offset of -22 at default font size", async () => {
      const { card } = await createCardFixture();

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      // @ts-expect-error: _getBarLabelOffset is private
      const offset = chartElement._getBarLabelOffset();
      expect(offset).toBe(-22);
    });

    it("should apply bar label offset to precipitation dataset", async () => {
      const { chart } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );

      // Dataset 2 is precipitation (bar chart)
      const precipDataset = chart.data.datasets[2];
      // @ts-expect-error: datalabels type
      expect(precipDataset.datalabels?.offset).toBe(-26);
    });

    it("should scale chart container height with font size", async () => {
      // Test with default font size (12)
      const { card: defaultCard } = await createCardFixture();
      const defaultChartElement = defaultCard.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;
      const defaultContainer = defaultChartElement.querySelector(
        ".wfc-forecast-chart"
      ) as HTMLElement;
      const defaultHeight = parseInt(defaultContainer.style.height);

      // Test with larger font size
      const { card: largerCard } = await createCardFixture(
        {},
        { "--wfc-chart-font-size": "16" }
      );
      const largerChartElement = largerCard.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      const largerContainer = largerChartElement.querySelector(
        ".wfc-forecast-chart"
      ) as HTMLElement;
      const largerHeight = parseInt(largerContainer.style.height);

      // Height should increase when font size increases
      // (exact value depends on when HappyDOM applies computed styles)
      expect(largerHeight).toBeGreaterThan(defaultHeight);
    });

    it("should use default chart height of 130px at default font size", async () => {
      const { card } = await createCardFixture();

      const chartElement = card.shadowRoot!.querySelector(
        "wfc-forecast-chart"
      ) as WfcForecastChart;

      const chartContainer = chartElement.querySelector(
        ".wfc-forecast-chart"
      ) as HTMLElement;

      expect(chartContainer.style.height).toBe("130px");
    });
  });
});
