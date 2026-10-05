import { beforeEach, describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import type {
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../src/types";

import "../src/index";
import { TEST_FORECAST_DAILY, TEST_FORECAST_HOURLY } from "./mocks/test-data";

const config: WeatherForecastCardConfig = {
  type: "custom:weather-forecast-card",
  entity: "weather.demo",
  forecast: { show_sun_times: false },
};

const mock = new MockHass();
mock.dailyForecast = TEST_FORECAST_DAILY;
mock.hourlyForecast = TEST_FORECAST_HOURLY;
const baseHass = mock.getHass() as ExtendedHomeAssistant;

// A device or area rename leaves every entity state untouched and only replaces
// the formatters, so `states` has to keep its identity for this to reproduce.
const hassWithName = (name: string): ExtendedHomeAssistant =>
  ({
    ...baseHass,
    config: { ...baseHass.config, version: "2026.4.0" },
    formatEntityName: () => name,
  }) as ExtendedHomeAssistant;

const renderedName = (card: WeatherForecastCard) =>
  card.shadowRoot?.querySelector(".wfc-name")?.textContent?.trim();

describe("entity name invalidation", () => {
  let card: WeatherForecastCard;

  beforeEach(async () => {
    card = await fixture<WeatherForecastCard>(
      html`<weather-forecast-card
        .hass=${hassWithName("Garden")}
        .config=${config}
      ></weather-forecast-card>`
    );
    card.setConfig(config);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  // A renamed device or area does not touch the weather entity's state, so
  // without watching the formatter the card kept the old label until something
  // unrelated forced a render (see #193).
  it("rerenders the name when the formatters are replaced", async () => {
    expect(renderedName(card)).toBe("Garden");

    card.hass = hassWithName("Back garden");
    await card.updateComplete;

    expect(renderedName(card)).toBe("Back garden");
  });
});
