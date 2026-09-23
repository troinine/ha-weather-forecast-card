import { describe, expect, it, vi } from "vitest";
import {
  bucketWeatherHistory,
  createCurrentWeatherTimelineEntry,
  parseWeatherHistoryResponse,
} from "../src/data/weather-history";
import { WeatherHistoryController } from "../src/controllers/weather-history-controller";
import type { ExtendedHomeAssistant } from "../src/types";
import type { WeatherEntity } from "../src/data/weather";

describe("weather history data", () => {
  it("decodes compressed history and inherits omitted attributes", () => {
    const result = parseWeatherHistoryResponse(
      {
        "weather.demo": [
          {
            s: "sunny",
            a: { temperature: 12, humidity: 60 },
            lu: 1_000,
          },
          {
            s: "cloudy",
            lu: 2_000,
          },
          {
            s: "rainy",
            a: { temperature: 10, humidity: 80 },
            lu: 3_000,
          },
        ],
      },
      "weather.demo"
    );

    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({
      state: "cloudy",
      attributes: { temperature: 12, humidity: 60 },
      timestamp: 2_000_000,
    });
  });

  it("accepts full REST-style history states and ignores malformed records", () => {
    const result = parseWeatherHistoryResponse(
      {
        "weather.demo": [
          {
            state: "sunny",
            attributes: { temperature: 15 },
            last_updated: "2026-07-17T10:00:00.000Z",
          },
          { state: "cloudy", attributes: {} },
          null,
        ],
      },
      "weather.demo"
    );

    expect(result).toEqual([
      {
        state: "sunny",
        attributes: { temperature: 15 },
        timestamp: Date.parse("2026-07-17T10:00:00.000Z"),
      },
    ]);
  });

  it("buckets observations against the forecast boundary using the latest update", () => {
    const boundary = Date.parse("2026-07-17T12:30:00.000Z");
    const result = bucketWeatherHistory(
      [
        {
          state: "sunny",
          attributes: { temperature: 10 },
          timestamp: Date.parse("2026-07-17T10:35:00.000Z"),
        },
        {
          state: "cloudy",
          attributes: { temperature: 11, humidity: 70 },
          timestamp: Date.parse("2026-07-17T11:20:00.000Z"),
        },
        {
          state: "rainy",
          attributes: { temperature: 12, humidity: 80 },
          timestamp: Date.parse("2026-07-17T11:50:00.000Z"),
        },
        {
          state: "sunny",
          attributes: { temperature: 99 },
          timestamp: boundary,
        },
      ],
      boundary
    );

    expect(result).toEqual([
      {
        datetime: "2026-07-17T10:30:00.000Z",
        temperature: 11,
        condition: "cloudy",
        apparent_temperature: undefined,
        humidity: 70,
        pressure: undefined,
        wind_speed: undefined,
        wind_bearing: undefined,
        uv_index: undefined,
      },
      {
        datetime: "2026-07-17T11:30:00.000Z",
        temperature: 12,
        condition: "rainy",
        apparent_temperature: undefined,
        humidity: 80,
        pressure: undefined,
        wind_speed: undefined,
        wind_bearing: undefined,
        uv_index: undefined,
      },
    ]);
  });

  it("creates a current boundary entry with a forecast temperature fallback", () => {
    const weatherEntity = {
      state: "partlycloudy",
      attributes: {
        humidity: 65,
      },
    } as WeatherEntity;

    expect(
      createCurrentWeatherTimelineEntry(
        weatherEntity,
        "2026-07-17T12:00:00.000Z",
        17
      )
    ).toMatchObject({
      datetime: "2026-07-17T12:00:00.000Z",
      temperature: 17,
      condition: "partlycloudy",
      humidity: 65,
    });
  });

  it("keeps repeated DST clock hours as distinct absolute slots", () => {
    const boundary = Date.parse("2026-10-25T03:00:00.000Z");
    const result = bucketWeatherHistory(
      [
        {
          state: "cloudy",
          attributes: { temperature: 9 },
          timestamp: Date.parse("2026-10-25T01:30:00.000Z"),
        },
        {
          state: "sunny",
          attributes: { temperature: 10 },
          timestamp: Date.parse("2026-10-25T02:30:00.000Z"),
        },
      ],
      boundary
    );

    expect(result.map((entry) => entry.datetime)).toEqual([
      "2026-10-25T01:00:00.000Z",
      "2026-10-25T02:00:00.000Z",
    ]);
  });
});

describe("weather history controller", () => {
  it("loads bounded 24-hour pages and deduplicates recorder states", async () => {
    const boundary = Date.parse("2026-07-17T12:00:00.000Z");
    const callWS = vi.fn(
      async (message: {
        start_time: string;
        end_time: string;
        entity_ids: string[];
      }) => {
        const timestamp = Date.parse(message.end_time) - 60 * 60 * 1000;
        return {
          "weather.demo": [
            {
              s: "sunny",
              a: { temperature: 14 },
              lu: timestamp / 1000,
            },
          ],
        };
      }
    );
    const hass = { callWS } as unknown as ExtendedHomeAssistant;
    const controller = new WeatherHistoryController();

    expect(controller.configure("weather.demo", boundary, 72, 1)).toBe(true);

    const first = await controller.loadPreviousPage(hass);
    expect(first?.forecast).toHaveLength(1);
    expect(first?.hasMore).toBe(true);

    const second = await controller.loadPreviousPage(hass);
    expect(second?.forecast).toHaveLength(2);
    expect(callWS).toHaveBeenCalledTimes(2);

    expect(callWS.mock.calls[0]![0]).toMatchObject({
      type: "history/history_during_period",
      entity_ids: ["weather.demo"],
      significant_changes_only: false,
      minimal_response: false,
      no_attributes: false,
    });
  });

  it("discards a response after configuration is reset", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const hass = {
      callWS: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          })
      ),
    } as unknown as ExtendedHomeAssistant;
    const controller = new WeatherHistoryController();
    const boundary = Date.parse("2026-07-17T12:00:00.000Z");

    controller.configure("weather.demo", boundary, 72, 1);
    const request = controller.loadPreviousPage(hass);
    controller.reset();
    resolveRequest?.({ "weather.demo": [] });

    await expect(request).resolves.toBeUndefined();
    expect(controller.snapshot().forecast).toEqual([]);
  });
});
