import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixture, waitUntil } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import type {
  ExtendedHomeAssistant,
  WeatherForecastCardConfig,
} from "../src/types";
import { ForecastMode } from "../src/types";
import type { WeatherForecastCard } from "../src/weather-forecast-card";

import "../src/index";

describe("historical weather scrolling", () => {
  let callWS: ReturnType<typeof vi.fn>;
  let hass: ExtendedHomeAssistant;
  let card: WeatherForecastCard;

  beforeEach(async () => {
    const mockHass = new MockHass();
    hass = mockHass.getHass() as ExtendedHomeAssistant;
    callWS = vi.fn(
      async (message: {
        start_time: string;
        end_time: string;
        entity_ids: string[];
      }) => {
        const end = Date.parse(message.end_time);
        return {
          "weather.demo": [
            {
              s: "cloudy",
              a: {
                temperature: 11,
                humidity: 75,
                pressure: 1009,
              },
              lu: (end - 2 * 60 * 60 * 1000) / 1000,
            },
            {
              s: "sunny",
              a: {
                temperature: 12,
                humidity: 65,
                pressure: 1012,
              },
              lu: (end - 60 * 60 * 1000) / 1000,
            },
          ],
        };
      }
    );
    hass.callWS = callWS;

    const config: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "hourly",
      forecast: {
        show_history: true,
        history_hours: 72,
        show_sun_times: false,
      },
    };

    card = await fixture<WeatherForecastCard>(html`
      <weather-forecast-card
        .hass=${hass}
        .config=${config}
      ></weather-forecast-card>
    `);
    card.setConfig(config);
    await card.updateComplete;
    await waitUntil(() => callWS.mock.calls.length === 1);
    await waitUntil(
      () => card.shadowRoot!.querySelectorAll(".wfc-history-slot").length === 2
    );
  });

  it("loads an initial page and renders observed slots plus the now boundary", () => {
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(card.shadowRoot!.querySelectorAll(".wfc-history-slot")).toHaveLength(
      2
    );
    expect(card.shadowRoot!.querySelector(".wfc-now-slot")).not.toBeNull();
  });

  it("positions the simple timeline at the now boundary", async () => {
    const simple = card.shadowRoot!.querySelector(
      "wfc-forecast-simple"
    ) as HTMLElement & {
      itemWidth: number;
      updateComplete: Promise<boolean>;
    };
    const scrollContainer = simple.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement;

    simple.itemWidth = 50;
    await simple.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(scrollContainer.scrollLeft).toBe(100);
  });

  it("does not return to now after an unrelated Home Assistant update", async () => {
    const simple = card.shadowRoot!.querySelector(
      "wfc-forecast-simple"
    ) as HTMLElement & {
      itemWidth: number;
      updateComplete: Promise<boolean>;
    };
    const scrollContainer = simple.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement;

    simple.itemWidth = 50;
    await simple.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    scrollContainer.scrollLeft = 25;
    card.hass = {
      ...hass,
      states: { ...hass.states },
    };
    await card.updateComplete;
    await simple.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(scrollContainer.scrollLeft).toBe(25);
  });

  it("uses now as the current slot's time label", () => {
    const nowSlot = card.shadowRoot!.querySelector(".wfc-now-slot");

    expect(
      nowSlot
        ?.querySelector(".wfc-forecast-slot-time-primary")
        ?.textContent?.trim()
    ).toBe("Now");
    expect(nowSlot?.hasAttribute("data-now-label")).toBe(false);
  });

  it("allows a historical slot action to return to daily view", async () => {
    const simple = card.shadowRoot!.querySelector(
      "wfc-forecast-simple"
    ) as HTMLElement & {
      _onForecastAction: (event: CustomEvent<{ action: "tap" }>) => void;
    };
    const historySlot = simple.querySelector(
      ".wfc-history-slot"
    ) as HTMLElement;

    historySlot.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        composed: true,
      })
    );
    simple._onForecastAction(
      new CustomEvent("action", {
        cancelable: true,
        detail: { action: "tap" },
      })
    );
    await card.updateComplete;

    expect(card.shadowRoot!.querySelectorAll(".wfc-history-slot")).toHaveLength(
      0
    );
    expect(card.shadowRoot!.querySelector(".wfc-now-slot")).toBeNull();
  });

  it("loads another page when the presentation requests older history", async () => {
    const simple = card.shadowRoot!.querySelector("wfc-forecast-simple");
    expect(simple).not.toBeNull();

    simple!.dispatchEvent(
      new CustomEvent("history-load-requested", {
        bubbles: true,
        composed: true,
      })
    );

    await waitUntil(() => callWS.mock.calls.length === 2);
    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it("keeps daily view forecast-only", async () => {
    const simple = card.shadowRoot!.querySelector("wfc-forecast-simple");
    simple!.dispatchEvent(
      new CustomEvent("action", {
        bubbles: true,
        composed: true,
        detail: { action: "tap" },
      })
    );

    await card.updateComplete;

    expect(card.shadowRoot!.querySelectorAll(".wfc-history-slot")).toHaveLength(
      0
    );
    expect(card.shadowRoot!.querySelector(".wfc-now-slot")).toBeNull();
  });

  it("renders historical slots and a now marker in chart mode", async () => {
    const config: WeatherForecastCardConfig = {
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      default_forecast: "hourly",
      forecast: {
        mode: ForecastMode.Chart,
        show_history: true,
        history_hours: 72,
        show_sun_times: false,
      },
    };
    const chartCard = await fixture<WeatherForecastCard>(html`
      <weather-forecast-card
        .hass=${hass}
        .config=${config}
      ></weather-forecast-card>
    `);
    chartCard.setConfig(config);
    await chartCard.updateComplete;
    await waitUntil(
      () =>
        chartCard.shadowRoot!.querySelectorAll(".wfc-history-slot").length > 0
    );

    const chart = chartCard.shadowRoot!.querySelector(
      "wfc-forecast-chart"
    ) as HTMLElement & {
      itemWidth: number;
      requestUpdate: () => void;
      updateComplete: Promise<boolean>;
    };
    chart.itemWidth = 55;
    await chart.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(chart.querySelector(".wfc-now-slot")).not.toBeNull();
    expect(chart.querySelectorAll(".wfc-history-slot")).toHaveLength(4);

    const scrollContainer = chart.querySelector(
      ".wfc-scroll-container"
    ) as HTMLElement;
    scrollContainer.scrollLeft = 30;
    chart.requestUpdate();
    await chart.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(scrollContainer.scrollLeft).toBe(30);
  });

  it("rejects history limits outside the supported range", () => {
    expect(() =>
      card.setConfig({
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          show_history: true,
          history_hours: 12,
        },
      })
    ).toThrow("history_hours must be a whole number from 24 to 168");
  });
});
