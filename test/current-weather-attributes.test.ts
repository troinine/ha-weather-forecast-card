import { beforeEach, describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import {
  CurrentWeatherAttributeConfig,
  ExtendedHomeAssistant,
} from "../src/types";
import { WeatherEntity } from "../src/data/weather";
import { WfcCurrentWeather } from "../src/components/wfc-current-weather";
import { NumberFormat } from "custom-card-helpers";

import "../src/components/wfc-current-weather";

const baseConfig = {
  type: "custom:weather-forecast-card",
  entity: "weather.demo",
};

describe("wfc-current-weather attributes", () => {
  let hass: ExtendedHomeAssistant;
  let weatherEntity: WeatherEntity;

  beforeEach(() => {
    const mockHass = new MockHass();
    hass = mockHass.getHass() as ExtendedHomeAssistant;

    const original = hass.states["weather.demo"] as WeatherEntity;
    weatherEntity = {
      ...original,
      attributes: {
        ...original.attributes,
        humidity: 40,
        pressure: 1000,
        wind_speed: 5,
        wind_gust_speed: 8.1,
        wind_bearing: undefined,
        visibility: 9,
        ozone: 200,
        uv_index: 3,
        dew_point: 1,
        apparent_temperature: 2,
        cloud_coverage: 50,
      },
    } as WeatherEntity;

    hass.states["weather.demo"] = weatherEntity;
  });

  it("does not render attributes when config is missing", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${baseConfig}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    expect(el.querySelector("wfc-current-weather-attributes")).toBeNull();
  });

  it("renders all default attributes when enabled", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { show_attributes: true },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    expect(items?.length).toBe(10);

    const labels = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-name")
    ).map((node) => node.textContent?.trim());

    expect(labels).toEqual([
      "Humidity",
      "Pressure",
      "Wind Speed",
      "Wind Gust Speed",
      "Visibility",
      "Ozone",
      "UV Index",
      "Dew Point",
      "Apparent Temperature",
      "Cloud Coverage",
    ]);

    const values = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-value")
    ).map((node) => node.textContent?.trim());

    expect(values).toEqual([
      "40 %",
      "1000 hPa",
      "5 m/s",
      "8.1 m/s",
      "9 km",
      "200 DU",
      "3",
      "1°C",
      "2°C",
      "50 %",
    ]);
  });

  it("respects attribute list when string provided", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { show_attributes: "wind_speed" },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    expect(items?.length).toBe(1);

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("5 m/s");
  });

  it("renders wind_gust_speed correctly with decimal comma", async () => {
    weatherEntity = {
      ...weatherEntity,
      attributes: {
        ...weatherEntity.attributes,
        wind_gust_speed: 8.1,
      },
    } as WeatherEntity;

    hass.states["weather.demo"] = weatherEntity;
    hass.locale.number_format = NumberFormat.decimal_comma;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { show_attributes: true },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    expect(items?.length).toBe(10);

    const values = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-value")
    ).map((node) => node.textContent?.trim());

    expect(values).toContain("8,1 m/s");
  });
});

describe("secondary_info_attribute", () => {
  let hass: ExtendedHomeAssistant;
  let weatherEntity: WeatherEntity;

  beforeEach(() => {
    const mockHass = new MockHass();
    hass = mockHass.getHass() as ExtendedHomeAssistant;

    const original = hass.states["weather.demo"] as WeatherEntity;
    weatherEntity = {
      ...original,
      attributes: {
        ...original.attributes,
        humidity: 65,
        pressure: 1013,
        wind_speed: 12,
        wind_bearing: 180,
        dew_point: 8,
        apparent_temperature: 22,
        cloud_coverage: 75,
      },
    } as WeatherEntity;

    hass.states["weather.demo"] = weatherEntity;
  });

  it("renders secondary info when secondary_info_attribute is set", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "humidity" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryInfo = el.querySelector(".wfc-current-secondary-info");
    expect(secondaryInfo).not.toBeNull();

    const value = secondaryInfo?.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("65 %");
  });

  it("renders secondary info with humidity icon", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "humidity" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const icon = el.querySelector(".wfc-current-secondary-icon");
    expect(icon).not.toBeNull();
    // @ts-expect-error icon exists
    expect(icon?.icon).toBe("mdi:water-percent");
  });

  it("renders secondary info with wind_speed icon", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "wind_speed" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const icon = el.querySelector(".wfc-current-secondary-icon");
    // @ts-expect-error icon exists
    expect(icon?.icon).toBe("mdi:weather-windy-variant");

    const value = el.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("12 m/s (S)");
  });

  it("renders secondary info with dew_point", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "dew_point" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const icon = el.querySelector(".wfc-current-secondary-icon");
    // @ts-expect-error icon exists
    expect(icon?.icon).toBe("mdi:water-thermometer-outline");

    const value = el.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("8°C");
  });

  it("renders secondary info with apparent_temperature", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "apparent_temperature" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const icon = el.querySelector(".wfc-current-secondary-icon");
    // @ts-expect-error icon exists
    expect(icon?.icon).toBe("mdi:thermometer");

    const value = el.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("22°C");
  });

  it("renders secondary info with pressure", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "pressure" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryIcon = el.querySelector(
      ".wfc-current-secondary-info .wfc-current-secondary-icon"
    );

    // @ts-expect-error icon exists
    expect(secondaryIcon?.icon).toBe("mdi:gauge");

    const value = el.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("1013 hPa");
  });

  it("falls back to extrema when secondary_info_attribute is non-existent", async () => {
    const mockHass = new MockHass();
    mockHass.hourlyForecast = [
      {
        datetime: new Date().toISOString(),
        temperature: 5.2,
        condition: "cloudy",
      },
      {
        datetime: new Date(Date.now() + 3600000).toISOString(),
        temperature: 7.1,
        condition: "cloudy",
      },
    ];
    mockHass.dailyForecast = [
      {
        datetime: new Date().toISOString(),
        temperature: 10,
        templow: 5.3,
        condition: "cloudy",
      },
    ];

    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "non_existent_attr" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
        .dailyForecast=${mockHass.dailyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryInfo = el.querySelector(".wfc-current-secondary-info");
    expect(secondaryInfo).not.toBeNull();

    const value = secondaryInfo?.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("10°C / 5.2°C");
  });

  it("falls back to humidity when extrema is missing", async () => {
    const mockHass = new MockHass();
    mockHass.hourlyForecast = [
      // @ts-expect-error temperature is mandatory although can be missing
      {
        datetime: new Date().toISOString(),
        condition: "cloudy",
      },
      // @ts-expect-error temperature is mandatory although can be missing
      {
        datetime: new Date(Date.now() + 3600000).toISOString(),
        condition: "cloudy",
      },
    ];
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${baseConfig}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryInfo = el.querySelector(".wfc-current-secondary-info");
    expect(secondaryInfo).not.toBeNull();

    const icon = secondaryInfo?.querySelector(".wfc-current-secondary-icon");
    // @ts-expect-error icon exists
    expect(icon?.icon).toBe("mdi:water-percent");

    const value = secondaryInfo?.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("65 %");
  });

  it("falls back to extrema when secondary_info_attribute is not set", async () => {
    const mockHass = new MockHass();
    mockHass.hourlyForecast = [
      {
        datetime: new Date().toISOString(),
        temperature: 5.2,
        condition: "cloudy",
      },
      {
        datetime: new Date(Date.now() + 3600000).toISOString(),
        temperature: 7.1,
        condition: "cloudy",
      },
    ];
    mockHass.dailyForecast = [
      {
        datetime: new Date().toISOString(),
        temperature: 10,
        templow: 5.3,
        condition: "cloudy",
      },
    ];

    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${baseConfig}
        .hourlyForecast=${mockHass.hourlyForecast}
        .dailyForecast=${mockHass.dailyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryInfo = el.querySelector(".wfc-current-secondary-info");
    expect(secondaryInfo).not.toBeNull();

    const secondaryIcon = el.querySelector(
      ".wfc-current-secondary-info .wfc-current-secondary-icon"
    );
    expect(secondaryIcon).toBeNull();

    const value = secondaryInfo?.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("10°C / 5.2°C");
  });

  it("renders secondary info with proper alignment styling", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { secondary_info_attribute: "humidity" },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryInfoContainer = el.querySelector(
      ".wfc-current-secondary-info"
    );
    expect(secondaryInfoContainer).not.toBeNull();

    const icon = secondaryInfoContainer?.querySelector(
      ".wfc-current-secondary-icon"
    );
    const value = secondaryInfoContainer?.querySelector(
      ".wfc-current-secondary-value"
    );

    expect(icon).not.toBeNull();
    expect(value).not.toBeNull();
  });
});

describe("custom entity attributes", () => {
  let hass: ExtendedHomeAssistant;
  let weatherEntity: WeatherEntity;

  beforeEach(() => {
    const mockHass = new MockHass();
    hass = mockHass.getHass() as ExtendedHomeAssistant;

    const original = hass.states["weather.demo"] as WeatherEntity;
    weatherEntity = {
      ...original,
      attributes: {
        ...original.attributes,
        humidity: 40,
        pressure: 1000,
        wind_speed: 5,
        wind_bearing: 180,
        dew_point: 8,
      },
    } as WeatherEntity;

    hass.states["weather.demo"] = weatherEntity;
  });

  it("renders custom entity value for humidity attribute", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "humidity", entity: "sensor.custom_humidity" },
            ],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("75 %");
  });

  it("renders custom entity value for pressure attribute", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "pressure", entity: "sensor.custom_pressure" },
            ],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("1025 hPa");
  });

  it("renders custom entity value for wind_speed with bearing from weather entity", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "wind_speed", entity: "sensor.custom_wind_speed" },
            ],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("15.5 km/h");
  });

  it("renders custom entity value for dew_point with temperature precision", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "dew_point", entity: "sensor.custom_dew_point" },
            ],
            temperature_precision: 1,
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("12.5°C");
  });

  it("renders mixed format config (strings and objects)", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              "humidity", // simple string, uses weather entity
              { name: "pressure", entity: "sensor.custom_pressure" }, // object with custom entity
            ] as (string | CurrentWeatherAttributeConfig)[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const values = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-value")
    ).map((node) => node.textContent?.trim());

    // First value from weather entity (40), second from custom sensor (1025)
    expect(values).toEqual(["40 %", "1025 hPa"]);
  });

  it("renders single object config format", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: {
              name: "humidity",
              entity: "sensor.custom_humidity",
            } as CurrentWeatherAttributeConfig,
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("75 %");
  });

  it("skips attribute when custom entity is unavailable", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "humidity", entity: "sensor.unavailable_sensor" },
              "pressure", // This should still render
            ] as (string | CurrentWeatherAttributeConfig)[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    // Only pressure should render since humidity sensor is unavailable
    expect(items?.length).toBe(1);

    const value = attrEl!.querySelector(
      ".wfc-current-attribute-value"
    )?.textContent;
    expect(value?.trim()).toBe("1000 hPa");
  });

  it("skips attribute when custom entity does not exist", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "humidity", entity: "sensor.non_existent" },
              "pressure",
            ] as (string | CurrentWeatherAttributeConfig)[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    // Only pressure should render
    expect(items?.length).toBe(1);
  });

  it("maintains backwards compatibility with boolean config", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { show_attributes: true },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    // Should show all available attributes from weather entity
    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    expect(items?.length).toBeGreaterThan(0);
  });

  it("maintains backwards compatibility with string array config", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: { show_attributes: ["humidity", "pressure"] },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    expect(items?.length).toBe(2);

    const values = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-value")
    ).map((node) => node.textContent?.trim());

    expect(values).toEqual(["40 %", "1000 hPa"]);
  });
});
