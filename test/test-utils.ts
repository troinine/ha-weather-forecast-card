import { expect } from "vitest";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import { html } from "lit";
import { WfcForecastChart } from "../src/components/wfc-forecast-chart";
import { Chart } from "chart.js";
import { fixture } from "@open-wc/testing";
import {
  ExtendedHomeAssistant,
  ForecastMode,
  WeatherForecastCardConfig,
} from "../src/types";

type TestFixtureOptions = {
  chartStyles?: Record<string, string>;
};

type TestFixtureResult = {
  card: WeatherForecastCard;
  chart?: Chart;
};

export const createWeatherForecastCardTestFixture = async (
  hass: ExtendedHomeAssistant,
  config: WeatherForecastCardConfig,
  options?: TestFixtureOptions
): Promise<TestFixtureResult> => {
  const card = await fixture<WeatherForecastCard>(html`
    <weather-forecast-card
      .hass=${hass}
      .config=${config}
    ></weather-forecast-card>
  `);

  expect(card).not.toBeNull();
  expect(card).toBeInstanceOf(WeatherForecastCard);

  card.setConfig(config);
  await card.updateComplete;

  await new Promise((resolve) => setTimeout(resolve, 150));

  let chart: WfcForecastChart | undefined;

  if (config.forecast?.mode === ForecastMode.Chart) {
    const chartElement = card.shadowRoot!.querySelector(
      "wfc-forecast-chart"
    ) as WfcForecastChart;

    expect(chartElement).not.toBeNull();

    Object.entries(options?.chartStyles ?? {}).forEach(([key, value]) => {
      chartElement.style.setProperty(key, value);
    });

    // Force chart initialization
    chartElement.itemWidth = 100;
    await chartElement.updateComplete;

    // @ts-expect-error: _chart is private
    chartElement.initChart();

    // @ts-expect-error: _chart is private
    chart = chartElement._chart as Chart;
  }

  return { card, chart };
};
