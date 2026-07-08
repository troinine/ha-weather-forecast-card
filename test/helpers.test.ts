import { describe, expect, it } from "vitest";
import { getReferencedCurrentEntities } from "../src/helpers";
import { WeatherForecastCardConfig } from "../src/types";

const baseConfig = (
  current: WeatherForecastCardConfig["current"]
): WeatherForecastCardConfig => ({
  type: "custom:weather-forecast-card",
  entity: "weather.demo",
  current,
});

describe("getReferencedCurrentEntities", () => {
  it("returns nothing when there is no current section", () => {
    expect(
      getReferencedCurrentEntities({
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
      })
    ).toEqual([]);
  });

  it("never includes the primary weather entity", () => {
    expect(getReferencedCurrentEntities(baseConfig({}))).toEqual([]);
  });

  it("collects the temperature_entity", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({ temperature_entity: "sensor.outdoor_temp" })
      )
    ).toEqual(["sensor.outdoor_temp"]);
  });

  it("collects the secondary_info_attribute custom entity", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({
          secondary_info_attribute: {
            name: "humidity",
            entity: "sensor.custom_humidity",
          },
        })
      )
    ).toEqual(["sensor.custom_humidity"]);
  });

  it("ignores a string secondary_info_attribute (weather attribute, no entity)", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({ secondary_info_attribute: "humidity" })
      )
    ).toEqual([]);
  });

  it("collects custom entities from an array of show_attributes", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({
          show_attributes: [
            "humidity",
            { name: "pressure", entity: "sensor.custom_pressure" },
            { entity: "sensor.custom_wind_speed" },
            null as never,
          ],
        })
      )
    ).toEqual(["sensor.custom_pressure", "sensor.custom_wind_speed"]);
  });

  it("collects a custom entity from a single-object show_attributes", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({ show_attributes: { entity: "sensor.custom_dew_point" } })
      )
    ).toEqual(["sensor.custom_dew_point"]);
  });

  it("ignores boolean and string forms of show_attributes", () => {
    expect(
      getReferencedCurrentEntities(baseConfig({ show_attributes: true }))
    ).toEqual([]);
    expect(
      getReferencedCurrentEntities(baseConfig({ show_attributes: "humidity" }))
    ).toEqual([]);
  });

  it("excludes a current-section entity that equals the primary entity", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({
          temperature_entity: "weather.demo",
          show_attributes: [{ entity: "weather.demo" }],
        })
      )
    ).toEqual([]);
  });

  it("ignores non-string entity values from misconfigured yaml", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({
          show_attributes: [{ entity: 123 as unknown as string }],
          secondary_info_attribute: {
            entity: 456 as unknown as string,
          },
        })
      )
    ).toEqual([]);
  });

  it("de-duplicates entities referenced from multiple sources", () => {
    expect(
      getReferencedCurrentEntities(
        baseConfig({
          temperature_entity: "sensor.outdoor_temp",
          secondary_info_attribute: { entity: "sensor.outdoor_temp" },
          show_attributes: [{ entity: "sensor.outdoor_temp" }],
        })
      )
    ).toEqual(["sensor.outdoor_temp"]);
  });
});
