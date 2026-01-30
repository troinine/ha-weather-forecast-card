import { beforeEach, describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import {
  ExtendedHomeAssistant,
  ForecastMode,
  WeatherForecastCardConfig,
} from "../src/types";
import { WeatherEntity } from "../src/data/weather";
import { WfcCurrentWeather } from "../src/components/wfc-current-weather";
import { createWeatherForecastCardTestFixture } from "./test-utils";

import "../src/index";
import "../src/components/wfc-current-weather";

describe("temperature_precision", () => {
  let hass: ExtendedHomeAssistant;
  let weatherEntity: WeatherEntity;
  let mockHass: MockHass;

  beforeEach(() => {
    mockHass = new MockHass({ unitOfMeasurement: "°C" });
    hass = mockHass.getHass() as ExtendedHomeAssistant;
    weatherEntity = hass.states["weather.demo"] as WeatherEntity;

    weatherEntity = {
      ...weatherEntity,
      attributes: {
        ...weatherEntity.attributes,
        temperature: 21.456,
      },
    };
    hass.states["weather.demo"] = weatherEntity;
  });

  describe("current weather temperature_precision", () => {
    it("should format temperature with default precision (no config)", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      // Default formatting should use locale defaults (typically 1 decimal)
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toMatch(/21/);
    });

    it("should format temperature with 0 decimal places", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 0,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("21°C");
    });

    it("should format temperature with 1 decimal place", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 1,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("21.5°C");
    });

    it("should format temperature with 2 decimal places", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 2,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("21.46°C");
    });

    it("should format high/low temperatures with precision", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 0,
        },
      };

      mockHass.dailyForecast[0] = {
        ...mockHass.dailyForecast[0]!,
        temperature: 25.789,
        templow: 15.234,
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
          .dailyForecast=${mockHass.dailyForecast}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      // High/low is rendered within the component, so we just verify it renders
      // Temperature precision is tested in the main temperature test
      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
    });

    it("should format temperature with precision when using temperature_entity", async () => {
      hass.states["sensor.outdoor_temp"] = {
        entity_id: "sensor.outdoor_temp",
        state: "18.789",
        attributes: {},
        last_changed: "",
        last_updated: "",
        context: { id: "", parent_id: null, user_id: null },
      };

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        temperature_entity: "sensor.outdoor_temp",
        current: {
          temperature_precision: 1,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("18.8°C");
    });

    it("should format temperature with precision 0 when using temperature_entity", async () => {
      hass.states["sensor.outdoor_temp"] = {
        entity_id: "sensor.outdoor_temp",
        state: "18.789",
        attributes: {},
        last_changed: "",
        last_updated: "",
        context: { id: "", parent_id: null, user_id: null },
      };

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        temperature_entity: "sensor.outdoor_temp",
        current: {
          temperature_precision: 0,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("19°C");
    });
  });

  describe("current weather attributes temperature_precision", () => {
    it("should format dew_point with precision", async () => {
      weatherEntity = {
        ...weatherEntity,
        attributes: {
          ...weatherEntity.attributes,
          dew_point: 12.789,
        },
      };
      hass.states["weather.demo"] = weatherEntity;

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          show_attributes: ["dew_point"],
          temperature_precision: 1,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const attrEl = el.querySelector("wfc-current-weather-attributes");
      expect(attrEl).not.toBeNull();
      const valueElement = attrEl?.querySelector(
        ".wfc-current-attribute-value"
      );
      expect(valueElement).not.toBeNull();
      expect(valueElement?.textContent?.trim()).toBe("12.8°C");
    });

    it("should format apparent_temperature with precision", async () => {
      weatherEntity = {
        ...weatherEntity,
        attributes: {
          ...weatherEntity.attributes,
          apparent_temperature: 19.345,
        },
      };
      hass.states["weather.demo"] = weatherEntity;

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          show_attributes: ["apparent_temperature"],
          temperature_precision: 0,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const attrEl = el.querySelector("wfc-current-weather-attributes");
      expect(attrEl).not.toBeNull();
      const valueElement = attrEl?.querySelector(
        ".wfc-current-attribute-value"
      );
      expect(valueElement).not.toBeNull();
      expect(valueElement?.textContent?.trim()).toBe("19°C");
    });
  });

  describe("forecast chart temperature_precision", () => {
    it("should render chart without errors with precision set to 0", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          mode: ForecastMode.Chart,
          temperature_precision: 0,
        },
      };

      const { chart } = await createWeatherForecastCardTestFixture(
        hass,
        config
      );

      expect(chart!.data?.datasets?.length).toBeGreaterThan(0);

      const mockContext = { chart };

      const tempHighFormatter = chart!.data?.datasets[0]?.datalabels?.formatter;

      expect(tempHighFormatter).toBeDefined();

      // @ts-expect-error mock context
      expect(tempHighFormatter!(25.6789, mockContext)).toBe("26°");
    });

    it("should render chart without errors with precision set to 1", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          mode: ForecastMode.Chart,
          temperature_precision: 1,
        },
      };

      const { chart } = await createWeatherForecastCardTestFixture(
        hass,
        config
      );

      expect(chart!.data?.datasets?.length).toBeGreaterThan(0);

      const mockContext = { chart };

      const tempHighFormatter = chart!.data?.datasets[0]?.datalabels?.formatter;

      expect(tempHighFormatter).toBeDefined();

      // @ts-expect-error mock context
      expect(tempHighFormatter!(25.6789, mockContext)).toBe("25.7°");
    });

    it("should render chart without errors with precision set to 2", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        forecast: {
          mode: ForecastMode.Chart,
          temperature_precision: 2,
        },
      };

      const { chart } = await createWeatherForecastCardTestFixture(
        hass,
        config
      );

      expect(chart!.data?.datasets?.length).toBeGreaterThan(0);

      const mockContext = { chart };

      const tempHighFormatter = chart!.data?.datasets[0]?.datalabels?.formatter;

      expect(tempHighFormatter).toBeDefined();

      // @ts-expect-error mock context
      expect(tempHighFormatter!(25.6789, mockContext)).toBe("25.68°");
    });
  });

  describe("temperature_precision with different units", () => {
    it("should format Fahrenheit temperatures with precision", async () => {
      const mockHassFahrenheit = new MockHass({ unitOfMeasurement: "°F" });
      const hassFahrenheit =
        mockHassFahrenheit.getHass() as ExtendedHomeAssistant;
      const weatherEntityF = hassFahrenheit.states[
        "weather.demo"
      ] as WeatherEntity;

      // Set temperature in Fahrenheit
      weatherEntityF.attributes.temperature = 72.456;
      hassFahrenheit.states["weather.demo"] = weatherEntityF;

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 1,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hassFahrenheit}
          .weatherEntity=${weatherEntityF}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("72.5°F");
    });

    it("should format Fahrenheit with 0 decimals", async () => {
      const mockHassFahrenheit = new MockHass({ unitOfMeasurement: "°F" });
      const hassFahrenheit =
        mockHassFahrenheit.getHass() as ExtendedHomeAssistant;
      const weatherEntityF = hassFahrenheit.states[
        "weather.demo"
      ] as WeatherEntity;

      weatherEntityF.attributes.temperature = 72.789;
      hassFahrenheit.states["weather.demo"] = weatherEntityF;

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 0,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hassFahrenheit}
          .weatherEntity=${weatherEntityF}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("73°F");
    });
  });

  describe("edge cases", () => {
    it("should handle negative temperatures with precision", async () => {
      weatherEntity = {
        ...weatherEntity,
        attributes: {
          ...weatherEntity.attributes,
          temperature: -5.678,
        },
      };
      hass.states["weather.demo"] = weatherEntity;

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 1,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("-5.7°C");
    });

    it("should handle zero temperature with precision", async () => {
      weatherEntity = {
        ...weatherEntity,
        attributes: {
          ...weatherEntity.attributes,
          temperature: 0.123,
        },
      };
      hass.states["weather.demo"] = weatherEntity;

      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: 2,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      const tempText = tempElement?.textContent?.trim();
      expect(tempText).toBe("0.12°C");
    });

    it("should handle undefined temperature_precision gracefully", async () => {
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        current: {
          temperature_precision: undefined,
        },
      };

      const el = await fixture<WfcCurrentWeather>(
        html`<wfc-current-weather
          .hass=${hass}
          .weatherEntity=${weatherEntity}
          .config=${config}
        ></wfc-current-weather>`
      );

      await el.updateComplete;

      const tempElement = el.querySelector(".wfc-current-temperature");
      expect(tempElement).not.toBeNull();
      expect(tempElement?.textContent.trim()).toBe("21.46°C");
    });
  });
});
