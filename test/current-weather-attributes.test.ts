import { beforeEach, describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import { ExtendedHomeAssistant } from "../src/types";
import { WeatherEntity } from "../src/data/weather";

import "../src/components/wfc-current-weather";
import { WfcCurrentWeather } from "../src/components/wfc-current-weather";

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
        wind_gust_speed: 8,
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
      "8 m/s",
      "9 km",
      "200 DU",
      "3",
      "1 °C",
      "2 °C",
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
});
