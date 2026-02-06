import { describe, it, expect } from "vitest";
import { aggregateHourlyForecastData } from "../src/data/weather";
import type { ForecastAttribute } from "../src/data/weather";

describe("aggregateHourlyForecastData", () => {
  describe("UV index aggregation", () => {
    it("should aggregate uv_index when hourly_group_size is 2", () => {
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T10:00:00",
          temperature: 20,
          uv_index: 3,
        },
        {
          datetime: "2024-01-01T11:00:00",
          temperature: 21,
          uv_index: 5,
        },
        {
          datetime: "2024-01-01T12:00:00",
          temperature: 22,
          uv_index: 7,
        },
        {
          datetime: "2024-01-01T13:00:00",
          temperature: 23,
          uv_index: 8,
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 2);

      expect(result).toHaveLength(2);
      // First group: 10:00 and 11:00, max UV should be 5
      expect(result[0]?.uv_index).toBe(5);
      // Second group: 12:00 and 13:00, max UV should be 8
      expect(result[1]?.uv_index).toBe(8);
    });

    it("should aggregate uv_index when hourly_group_size is 3", () => {
      // Use ISO format without Z to avoid timezone issues
      // The aggregateHourlyForecastData function uses getHours() which works in local timezone
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T12:00:00",
          temperature: 22,
          uv_index: 8,
        },
        {
          datetime: "2024-01-01T13:00:00",
          temperature: 23,
          uv_index: 9,
        },
        {
          datetime: "2024-01-01T14:00:00",
          temperature: 22,
          uv_index: 7,
        },
        {
          datetime: "2024-01-01T15:00:00",
          temperature: 21,
          uv_index: 6,
        },
        {
          datetime: "2024-01-01T16:00:00",
          temperature: 20,
          uv_index: 5,
        },
        {
          datetime: "2024-01-01T17:00:00",
          temperature: 19,
          uv_index: 3,
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 3);

      expect(result).toHaveLength(2);
      // First group: 12:00, 13:00, 14:00 - max UV should be 9
      expect(result[0]?.uv_index).toBe(9);
      // Second group: 15:00, 16:00, 17:00 - max UV should be 6
      expect(result[1]?.uv_index).toBe(6);
    });

    it("should handle missing uv_index values", () => {
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T10:00:00",
          temperature: 20,
          uv_index: 3,
        },
        {
          datetime: "2024-01-01T11:00:00",
          temperature: 21,
          // uv_index missing
        },
        {
          datetime: "2024-01-01T12:00:00",
          temperature: 22,
          uv_index: 7,
        },
        {
          datetime: "2024-01-01T13:00:00",
          temperature: 23,
          // uv_index missing
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 2);

      expect(result).toHaveLength(2);
      // First group has UV data, should use max
      expect(result[0]?.uv_index).toBe(3);
      // Second group has UV data, should use max
      expect(result[1]?.uv_index).toBe(7);
    });

    it("should not include uv_index when all values are missing in group", () => {
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T10:00:00",
          temperature: 20,
          // uv_index missing
        },
        {
          datetime: "2024-01-01T11:00:00",
          temperature: 21,
          // uv_index missing
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 2);

      expect(result).toHaveLength(1);
      expect(result[0]?.uv_index).toBeUndefined();
    });
  });

  describe("apparent_temperature aggregation", () => {
    it("should aggregate apparent_temperature when hourly_group_size is 2", () => {
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T10:00:00",
          temperature: 20,
          apparent_temperature: 18,
        },
        {
          datetime: "2024-01-01T11:00:00",
          temperature: 21,
          apparent_temperature: 19,
        },
        {
          datetime: "2024-01-01T12:00:00",
          temperature: 22,
          apparent_temperature: 21,
        },
        {
          datetime: "2024-01-01T13:00:00",
          temperature: 23,
          apparent_temperature: 22,
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 2);

      expect(result).toHaveLength(2);
      // First group: average of 18 and 19
      expect(result[0]?.apparent_temperature).toBe(18.5);
      // Second group: average of 21 and 22
      expect(result[1]?.apparent_temperature).toBe(21.5);
    });

    it("should handle missing apparent_temperature values", () => {
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T10:00:00",
          temperature: 20,
          apparent_temperature: 18,
        },
        {
          datetime: "2024-01-01T11:00:00",
          temperature: 21,
          // apparent_temperature missing
        },
        {
          datetime: "2024-01-01T12:00:00",
          temperature: 22,
          apparent_temperature: 21,
        },
        {
          datetime: "2024-01-01T13:00:00",
          temperature: 23,
          apparent_temperature: 22,
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 2);

      expect(result).toHaveLength(2);
      // First group only has one value
      expect(result[0]?.apparent_temperature).toBe(18);
      // Second group: average of 21 and 22
      expect(result[1]?.apparent_temperature).toBe(21.5);
    });

    it("should not include apparent_temperature when all values are missing in group", () => {
      const forecast: ForecastAttribute[] = [
        {
          datetime: "2024-01-01T10:00:00",
          temperature: 20,
          // apparent_temperature missing
        },
        {
          datetime: "2024-01-01T11:00:00",
          temperature: 21,
          // apparent_temperature missing
        },
      ];

      const result = aggregateHourlyForecastData(forecast, 2);

      expect(result).toHaveLength(1);
      expect(result[0]?.apparent_temperature).toBeUndefined();
    });
  });
});
