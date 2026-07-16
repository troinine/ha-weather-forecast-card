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
      "Wind speed",
      "Wind gust speed",
      "Visibility",
      "Ozone",
      "UV index",
      "Dew point",
      "Apparent temperature",
      "Cloud coverage",
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

  it("ignores null and empty placeholder items in show_attributes", async () => {
    // The HA editor inserts a null placeholder when a new list item is added,
    // before a value is chosen. These must not crash the render.
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              "wind_speed",
              null,
              {},
            ] as unknown as CurrentWeatherAttributeConfig[],
          },
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
});

describe("compact attributes layout", () => {
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
        wind_bearing: undefined,
      },
    } as WeatherEntity;

    hass.states["weather.demo"] = weatherEntity;
  });

  const renderAttributes = async (
    layout?: "default" | "compact"
  ): Promise<Element> => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: ["humidity", "pressure", "wind_speed"],
            ...(layout ? { attributes_layout: layout } : {}),
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();
    return attrEl!;
  };

  it("applies the compact grid class when attributes_layout is compact", async () => {
    const attrEl = await renderAttributes("compact");

    const container = attrEl.querySelector(".wfc-current-attributes");
    expect(container?.classList.contains("wfc-compact")).toBe(true);
  });

  it("does not apply the compact class by default", async () => {
    const attrEl = await renderAttributes();

    const container = attrEl.querySelector(".wfc-current-attributes");
    expect(container).not.toBeNull();
    expect(container?.classList.contains("wfc-compact")).toBe(false);
  });

  it("does not apply the compact class when attributes_layout is default", async () => {
    const attrEl = await renderAttributes("default");

    const container = attrEl.querySelector(".wfc-current-attributes");
    expect(container?.classList.contains("wfc-compact")).toBe(false);
  });

  it("drops the visible labels but keeps the values in compact layout", async () => {
    const attrEl = await renderAttributes("compact");

    expect(
      attrEl.querySelectorAll(".wfc-current-attribute-name").length
    ).toBe(0);
    expect(
      attrEl.querySelectorAll(".wfc-current-attribute-value").length
    ).toBe(3);
  });

  it("exposes the label as a title on each chip for accessibility", async () => {
    const attrEl = await renderAttributes("compact");

    const titles = Array.from(
      attrEl.querySelectorAll(".wfc-current-attribute")
    ).map((node) => node.getAttribute("title"));

    expect(titles).toEqual(["Humidity", "Pressure", "Wind speed"]);
  });

  it("keeps labels and sets no title in the default layout", async () => {
    const attrEl = await renderAttributes("default");

    const labels = Array.from(
      attrEl.querySelectorAll(".wfc-current-attribute-name")
    ).map((node) => node.textContent?.trim());
    expect(labels).toEqual(["Humidity", "Pressure", "Wind speed"]);

    expect(attrEl.querySelector(".wfc-current-attribute[title]")).toBeNull();
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

  it("renders secondary info from an entity-only custom sensor via ha-state-icon", async () => {
    const mockHass = new MockHass();
    const testHass = mockHass.getHass() as ExtendedHomeAssistant;
    testHass.states["weather.demo"] = weatherEntity;

    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${testHass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            secondary_info_attribute: {
              entity: "sensor.custom_pressure",
            } as CurrentWeatherAttributeConfig,
          },
        }}
        .hourlyForecast=${mockHass.hourlyForecast}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const secondaryInfo = el.querySelector(".wfc-current-secondary-info");
    expect(secondaryInfo).not.toBeNull();

    // Icon resolution is delegated to HA, not force-fed as mdi:gauge.
    expect(secondaryInfo?.querySelector("ha-attribute-icon")).toBeNull();

    const stateIcon = secondaryInfo?.querySelector("ha-state-icon");
    expect(stateIcon).not.toBeNull();
    // @ts-expect-error mock property
    expect(stateIcon?.stateObj?.entity_id).toBe("sensor.custom_pressure");
    // @ts-expect-error mock property
    expect(stateIcon?.icon).toBeUndefined();

    const value = secondaryInfo?.querySelector(".wfc-current-secondary-value");
    expect(value?.textContent?.trim()).toBe("1025 hPa");
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

  it("renders entity-only items (no name) from the entity state", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { entity: "sensor.custom_humidity" },
              {
                entity: "sensor.custom_pressure",
                label: "Outside",
                icon: "mdi:abacus",
              },
            ] as CurrentWeatherAttributeConfig[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes");
    expect(attrEl).not.toBeNull();

    const items = attrEl?.querySelectorAll(".wfc-current-attribute");
    expect(items?.length).toBe(2);

    const labels = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-name")
    ).map((node) => node.textContent?.trim());
    const values = Array.from(
      attrEl!.querySelectorAll(".wfc-current-attribute-value")
    ).map((node) => node.textContent?.trim());

    // entity-only with no label falls back to the entity friendly_name
    expect(labels[0]).toBe("Custom Humidity Sensor");
    expect(values[0]).toBe("75 %");
    // explicit label override works on an entity-only item
    expect(labels[1]).toBe("Outside");
    expect(values[1]).toBe("1025 hPa");
  });

  it("delegates entity-only icons to ha-state-icon instead of forcing mdi:gauge", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { entity: "sensor.custom_pressure" },
            ] as CurrentWeatherAttributeConfig[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes")!;

    // The entity's own icon is resolved by HA, not force-fed as mdi:gauge.
    expect(attrEl.querySelector("ha-attribute-icon")).toBeNull();

    const stateIcon = attrEl.querySelector("ha-state-icon");
    expect(stateIcon).not.toBeNull();
    // @ts-expect-error mock property
    expect(stateIcon?.stateObj?.entity_id).toBe("sensor.custom_pressure");
    // No explicit icon -> delegated to ha-state-icon (undefined prop).
    // @ts-expect-error mock property
    expect(stateIcon?.icon).toBeUndefined();
  });

  it("passes an explicit icon through to ha-state-icon for entity-only items", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { entity: "sensor.custom_pressure", icon: "mdi:abacus" },
            ] as CurrentWeatherAttributeConfig[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes")!;
    const stateIcon = attrEl.querySelector("ha-state-icon");
    expect(stateIcon).not.toBeNull();
    // @ts-expect-error mock property
    expect(stateIcon?.icon).toBe("mdi:abacus");
  });

  it("keeps the weather-attribute icon for an attribute backed by a custom entity", async () => {
    const el = await fixture<WfcCurrentWeather>(
      html`<wfc-current-weather
        .hass=${hass}
        .weatherEntity=${weatherEntity}
        .config=${{
          ...baseConfig,
          current: {
            show_attributes: [
              { name: "humidity", entity: "sensor.custom_humidity" },
            ] as CurrentWeatherAttributeConfig[],
          },
        }}
      ></wfc-current-weather>`
    );

    await el.updateComplete;

    const attrEl = el.querySelector("wfc-current-weather-attributes")!;
    // A named attribute keeps the attribute icon so it matches its label.
    expect(attrEl.querySelector("ha-state-icon")).toBeNull();

    const attrIcon = attrEl.querySelector("ha-attribute-icon");
    expect(attrIcon).not.toBeNull();
    // @ts-expect-error mock property
    expect(attrIcon?.icon).toBe("mdi:water-percent");
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
