import { describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { WeatherForecastCard } from "../src/weather-forecast-card";
import {
  ExtendedHomeAssistant,
  ForecastMode,
  WeatherForecastCardConfig,
} from "../src/types";
import { TEST_FORECAST_DAILY } from "./mocks/test-data";
import "../src/index";
import {
  readCachedForecast,
  trimPastForecast,
  writeCachedForecast,
} from "../src/data/forecast-cache";
import { ForecastEvent } from "../src/data/weather";

const HOUR = 60 * 60 * 1000;
const NOW = new Date(2026, 9, 9, 14, 30).getTime();

const hourly = (startOffsetH: number, count: number): ForecastEvent => ({
  type: "hourly",
  forecast: Array.from({ length: count }, (_, i) => ({
    datetime: new Date(
      new Date(2026, 9, 9, 14).getTime() + (startOffsetH + i) * HOUR
    ).toISOString(),
    temperature: 20 + i,
    condition: "sunny",
  })) as ForecastEvent["forecast"],
});

const daily = (firstDay: number, count: number): ForecastEvent => ({
  type: "daily",
  forecast: Array.from({ length: count }, (_, i) => ({
    datetime: new Date(2026, 9, firstDay + i, 12).toISOString(),
    temperature: 25,
    condition: "sunny",
  })) as ForecastEvent["forecast"],
});

describe("forecast cache", () => {
  it("round-trips an event", () => {
    writeCachedForecast("weather.home", hourly(0, 5), NOW);
    expect(
      readCachedForecast("weather.home", "hourly", NOW)?.forecast
    ).toHaveLength(5);
  });

  it("keys by entity and forecast type", () => {
    writeCachedForecast("weather.home", hourly(0, 5), NOW);
    expect(readCachedForecast("weather.other", "hourly", NOW)).toBeUndefined();
    expect(readCachedForecast("weather.home", "daily", NOW)).toBeUndefined();
  });

  it("ignores entries older than six hours", () => {
    writeCachedForecast("weather.home", hourly(0, 24), NOW - 7 * HOUR);
    expect(readCachedForecast("weather.home", "hourly", NOW)).toBeUndefined();
  });

  it("does not cache an empty forecast", () => {
    writeCachedForecast("weather.home", { type: "daily", forecast: null }, NOW);
    expect(readCachedForecast("weather.home", "daily", NOW)).toBeUndefined();
  });

  it("survives malformed storage", () => {
    window.localStorage.setItem(
      "weather-forecast-card:forecast:weather.home:daily",
      "{not json"
    );
    expect(readCachedForecast("weather.home", "daily", NOW)).toBeUndefined();
  });

  it("drops hours that have already ended, keeping the current one", () => {
    // 12:00 and 13:00 are over at 14:30; 14:00 is the current hour.
    const trimmed = trimPastForecast(hourly(-2, 5), NOW);
    expect(trimmed?.forecast).toHaveLength(3);
    expect(new Date(trimmed!.forecast![0].datetime).getHours()).toBe(14);
  });

  it("drops days before today, keeping today", () => {
    const trimmed = trimPastForecast(daily(7, 5), NOW);
    expect(trimmed?.forecast).toHaveLength(3);
    expect(new Date(trimmed!.forecast![0].datetime).getDate()).toBe(9);
  });

  it("returns undefined when every entry is in the past", () => {
    expect(trimPastForecast(hourly(-10, 3), NOW)).toBeUndefined();
  });
});

describe("card seeded from the forecast cache", () => {
  const config: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
    default_forecast: "daily",
    forecast: { mode: ForecastMode.Simple, show_sun_times: false },
  };

  // A subscription that never delivers stands in for a reply still queued
  // behind the rest of the dashboard's websocket traffic.
  const mountWithoutLiveForecast = async (cardConfig = config) => {
    const hass = new MockHass({
      rejectForecastSubscribe: true,
    }).getHass() as ExtendedHomeAssistant;
    const card = await fixture<WeatherForecastCard>(
      html`<weather-forecast-card
        .hass=${hass}
        .config=${cardConfig}
      ></weather-forecast-card>`
    );
    card.setConfig(cardConfig);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));
    return card;
  };

  it("renders the cached forecast before the subscription answers", async () => {
    writeCachedForecast("weather.demo", {
      type: "daily",
      forecast: TEST_FORECAST_DAILY as ForecastEvent["forecast"],
    });

    const card = await mountWithoutLiveForecast();

    // @ts-expect-error: accessing private property
    expect(card._dailyForecastData?.length).toBe(TEST_FORECAST_DAILY.length);
    expect(
      card.shadowRoot?.querySelectorAll("wfc-forecast-simple").length
    ).toBeGreaterThan(0);
  });

  it("does not read the cache when forecast_cache is false", async () => {
    writeCachedForecast("weather.demo", {
      type: "daily",
      forecast: TEST_FORECAST_DAILY as ForecastEvent["forecast"],
    });

    const card = await mountWithoutLiveForecast({
      ...config,
      forecast_cache: false,
    });

    // @ts-expect-error: accessing private property
    expect(card._dailyForecastData).toBeUndefined();
  });

  it("caches the live event once the subscription answers", async () => {
    const hass = new MockHass().getHass() as ExtendedHomeAssistant;
    const card = await fixture<WeatherForecastCard>(
      html`<weather-forecast-card
        .hass=${hass}
        .config=${config}
      ></weather-forecast-card>`
    );
    card.setConfig(config);
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(
      readCachedForecast("weather.demo", "daily")?.forecast?.length
    ).toBeGreaterThan(0);
    expect(readCachedForecast("weather.demo", "hourly")).toBeDefined();
  });
});
