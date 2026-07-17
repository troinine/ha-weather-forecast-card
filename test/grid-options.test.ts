import { describe, expect, it } from "vitest";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import { ForecastMode, WeatherForecastCardConfig } from "../src/types";

import "../src/index";

function createCard(
  config: Partial<WeatherForecastCardConfig> = {}
): WeatherForecastCard {
  const card = document.createElement(
    "weather-forecast-card"
  ) as WeatherForecastCard;

  card.setConfig({
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
    ...config,
  } as WeatherForecastCardConfig);

  return card;
}

describe("weather-forecast-card grid options", () => {
  it("reports a 12-column grid with integer rows so it snaps in Sections view", () => {
    const options = createCard().getGridOptions();

    expect(options.columns).toBe(12);
    expect(Number.isInteger(options.rows)).toBe(true);
    expect(options.rows).not.toBe("auto");
  });

  it("never reports a minimum larger than the default rows", () => {
    const configs: Partial<WeatherForecastCardConfig>[] = [
      {},
      { show_current: false },
      { show_forecast: false },
      { forecast: { mode: ForecastMode.Chart } },
      { current: { show_attributes: true } },
    ];

    for (const config of configs) {
      const options = createCard(config).getGridOptions();
      expect(options.min_rows).toBeLessThanOrEqual(options.rows as number);
    }
  });

  it("uses automatic rows when collapsible attributes can change the card height", () => {
    const options = createCard({
      current: {
        show_attributes: true,
        attributes_collapsible: true,
      },
    }).getGridOptions();

    expect(options.rows).toBe("auto");
  });

  it("keeps numeric rows when collapsible attributes are not configured", () => {
    const options = createCard({
      current: {
        show_attributes: false,
        attributes_collapsible: true,
      },
    }).getGridOptions();

    expect(Number.isInteger(options.rows)).toBe(true);
  });

  it("keeps numeric rows when the current weather block is hidden", () => {
    const options = createCard({
      show_current: false,
      current: {
        show_attributes: true,
        attributes_collapsible: true,
      },
    }).getGridOptions();

    expect(Number.isInteger(options.rows)).toBe(true);
  });

  it("requires more rows for the taller chart forecast than the simple forecast", () => {
    const simple = createCard({
      forecast: { mode: ForecastMode.Simple },
    }).getGridOptions();
    const chart = createCard({
      forecast: { mode: ForecastMode.Chart },
    }).getGridOptions();

    expect(chart.rows as number).toBeGreaterThan(simple.rows as number);
  });

  it("reserves extra height when current attributes are shown", () => {
    const without = createCard({
      current: { show_attributes: false },
    }).getGridOptions();
    const withAttrs = createCard({
      current: { show_attributes: true },
    }).getGridOptions();

    expect(withAttrs.rows as number).toBeGreaterThan(without.rows as number);
  });

  it("drops a block's rows when that block is hidden", () => {
    const both = createCard().getGridOptions();
    const currentOnly = createCard({ show_forecast: false }).getGridOptions();
    const forecastOnly = createCard({ show_current: false }).getGridOptions();

    expect(currentOnly.rows as number).toBeLessThan(both.rows as number);
    expect(forecastOnly.rows as number).toBeLessThan(both.rows as number);
  });

  it("widens the minimum columns only when both blocks are shown", () => {
    expect(createCard().getGridOptions().min_columns).toBe(6);
    expect(
      createCard({ show_forecast: false }).getGridOptions().min_columns
    ).toBe(4);
    expect(
      createCard({ show_current: false }).getGridOptions().min_columns
    ).toBe(4);
  });

  it("exposes a masonry card size consistent with the grid rows", () => {
    const card = createCard();

    expect(card.getCardSize()).toBe(card.getGridOptions().rows);
  });
});
