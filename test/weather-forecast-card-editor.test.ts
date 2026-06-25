import { describe, expect, it } from "vitest";
import { CURRENT_WEATHER_ATTRIBUTES } from "../src/types";
import {
  isKnownAttribute,
  extractCustomAttributes,
  extractKnownItems,
  buildShowAttributes,
  rebuildShowAttributesWithCustom,
  denormalizeConfig,
} from "../src/editor/weather-forecast-card-editor";

// Worked example config used across multiple tests
const workedExampleShowAttributes = [
  { entity: "sensor.time" },
  "wind_speed",
  { entity: "sensor.wash", icon: "mdi:abacus", label: "kokkeli" },
  { name: "humidity", entity: "sensor.my_hum", label: "Hum" },
];

const workedExampleConfig = {
  type: "custom:weather-forecast-card" as const,
  entity: "weather.demo",
  current: {
    show_attributes: workedExampleShowAttributes,
  },
};

describe("isKnownAttribute", () => {
  it("returns true for a known attribute", () => {
    expect(isKnownAttribute("humidity")).toBe(true);
    expect(isKnownAttribute("wind_speed")).toBe(true);
    expect(isKnownAttribute("cloud_coverage")).toBe(true);
  });

  it("returns false for an unknown attribute name", () => {
    expect(isKnownAttribute("soil_moisture")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isKnownAttribute(undefined)).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isKnownAttribute(42)).toBe(false);
    expect(isKnownAttribute(null)).toBe(false);
    expect(isKnownAttribute({})).toBe(false);
  });
});

describe("extractCustomAttributes", () => {
  it("returns entity-only items as-is", () => {
    const result = extractCustomAttributes([{ entity: "sensor.time" }]);
    expect(result).toEqual([{ entity: "sensor.time" }]);
  });

  it("returns arbitrary-name items as-is", () => {
    const result = extractCustomAttributes([
      { entity: "sensor.wash", icon: "mdi:abacus", label: "kokkeli" },
    ]);
    expect(result).toEqual([
      { entity: "sensor.wash", icon: "mdi:abacus", label: "kokkeli" },
    ]);
  });

  it("returns custom items from the worked example", () => {
    const result = extractCustomAttributes(workedExampleShowAttributes);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ entity: "sensor.time" });
    expect(result).toContainEqual({
      entity: "sensor.wash",
      icon: "mdi:abacus",
      label: "kokkeli",
    });
    // known items must NOT appear
    expect(result.some((c) => c.name === "humidity")).toBe(false);
    expect(result.some((c) => (c as { name?: string }).name === "wind_speed")).toBe(false);
  });

  it("wraps unknown string items as objects with name", () => {
    const result = extractCustomAttributes(["soil_moisture"]);
    expect(result).toEqual([{ name: "soil_moisture" }]);
  });

  it("does NOT wrap known string items", () => {
    const result = extractCustomAttributes(["humidity", "wind_speed"]);
    expect(result).toHaveLength(0);
  });

  it("returns [] for true", () => {
    expect(extractCustomAttributes(true)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(extractCustomAttributes(undefined)).toEqual([]);
  });

  it("returns [] for a plain string", () => {
    expect(extractCustomAttributes("humidity")).toEqual([]);
  });

  it("drops null entries in arrays", () => {
    const result = extractCustomAttributes([null, { entity: "sensor.time" }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ entity: "sensor.time" });
  });
});

describe("denormalizeConfig", () => {
  it("extracts only known attributes into current.show_attributes", () => {
    const form = denormalizeConfig(workedExampleConfig);
    expect(form["current.show_attributes"]).toEqual(["wind_speed", "humidity"]);
  });

  it("flattens humidity entity and label overrides", () => {
    const form = denormalizeConfig(workedExampleConfig);
    expect(form["current.attribute_entity_humidity"]).toBe("sensor.my_hum");
    expect(form["current.attribute_label_humidity"]).toBe("Hum");
  });

  it("does not include entity-only items in the form's show_attributes", () => {
    const form = denormalizeConfig(workedExampleConfig);
    const attrs: string[] = form["current.show_attributes"];
    // sensor.time and sensor.wash are entity-only — must not appear
    expect(attrs).not.toContain("sensor.time");
    expect(attrs).not.toContain("sensor.wash");
  });

  it("does not create form keys for custom (entity-only) items", () => {
    const form = denormalizeConfig(workedExampleConfig);
    // No flat key for entity-only items
    const keys = Object.keys(form);
    expect(keys.some((k) => k.includes("sensor.time"))).toBe(false);
    expect(keys.some((k) => k.includes("sensor.wash"))).toBe(false);
  });

  it("expands true to all 10 known attributes", () => {
    const form = denormalizeConfig({
      type: "custom:weather-forecast-card",
      entity: "weather.demo",
      current: { show_attributes: true },
    });
    expect(form["current.show_attributes"]).toEqual([
      ...CURRENT_WEATHER_ATTRIBUTES,
    ]);
  });
});

describe("buildShowAttributes", () => {
  it("returns true when all 10 known attributes selected, no overrides, no custom", () => {
    const result = buildShowAttributes(
      [...CURRENT_WEATHER_ATTRIBUTES],
      { entity: {}, label: {}, icon: {} },
      []
    );
    expect(result).toBe(true);
  });

  it("returns mixed array with entity+label override for known and custom items appended", () => {
    const customItems = extractCustomAttributes(workedExampleShowAttributes);
    const result = buildShowAttributes(
      ["wind_speed", "humidity"],
      {
        entity: { humidity: "sensor.my_hum" },
        label: { humidity: "Hum" },
        icon: {},
      },
      customItems
    );

    expect(Array.isArray(result)).toBe(true);
    const arr = result as (string | { name?: string; entity?: string; label?: string; icon?: string })[];

    // wind_speed has no overrides → remains a string
    expect(arr).toContain("wind_speed");

    // humidity has overrides → becomes an object
    const humidityItem = arr.find(
      (item) => typeof item === "object" && item.name === "humidity"
    ) as { name: string; entity: string; label: string } | undefined;
    expect(humidityItem).toBeDefined();
    expect(humidityItem?.entity).toBe("sensor.my_hum");
    expect(humidityItem?.label).toBe("Hum");

    // custom items appended at the end
    expect(arr).toContainEqual({ entity: "sensor.time" });
    expect(arr).toContainEqual({
      entity: "sensor.wash",
      icon: "mdi:abacus",
      label: "kokkeli",
    });
  });

  it("places known items before custom items", () => {
    const customItems = [{ entity: "sensor.time" }];
    const result = buildShowAttributes(
      ["humidity"],
      { entity: {}, label: {}, icon: {} },
      customItems
    ) as unknown[];
    const humidityIdx = result.indexOf("humidity");
    const customIdx = result.findIndex(
      (item) =>
        typeof item === "object" &&
        (item as { entity?: string }).entity === "sensor.time"
    );
    expect(humidityIdx).toBeLessThan(customIdx);
  });

  it("does not return true when there are custom items even if all known are selected", () => {
    const result = buildShowAttributes(
      [...CURRENT_WEATHER_ATTRIBUTES],
      { entity: {}, label: {}, icon: {} },
      [{ entity: "sensor.time" }]
    );
    expect(result).not.toBe(true);
    expect(Array.isArray(result)).toBe(true);
  });

  it("does not return true when there are overrides even if all known are selected", () => {
    const result = buildShowAttributes(
      [...CURRENT_WEATHER_ATTRIBUTES],
      { entity: { humidity: "sensor.my_hum" }, label: {}, icon: {} },
      []
    );
    expect(result).not.toBe(true);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("round-trip preservation", () => {
  it("preserves entity-only custom items through denormalizeConfig + buildShowAttributes", () => {
    // Step 1: denormalize the config → get the form data
    const formData = denormalizeConfig(workedExampleConfig);

    // Step 2: derive selectedKnownNames from form
    const selectedKnownNames: string[] = formData["current.show_attributes"];

    // Step 3: collect override maps from flat form fields
    const entityOverrides: Record<string, string> = {};
    const labelOverrides: Record<string, string> = {};
    const iconOverrides: Record<string, string> = {};

    for (const key of Object.keys(formData)) {
      if (key.startsWith("current.attribute_entity_")) {
        const attr = key.replace("current.attribute_entity_", "");
        entityOverrides[attr] = formData[key];
      } else if (key.startsWith("current.attribute_label_")) {
        const attr = key.replace("current.attribute_label_", "");
        labelOverrides[attr] = formData[key];
      } else if (key.startsWith("current.attribute_icon_")) {
        const attr = key.replace("current.attribute_icon_", "");
        iconOverrides[attr] = formData[key];
      }
    }

    // Step 4: extract custom items from the original config
    const customItems = extractCustomAttributes(
      workedExampleConfig.current.show_attributes
    );

    // Step 5: rebuild
    const rebuilt = buildShowAttributes(
      selectedKnownNames,
      { entity: entityOverrides, label: labelOverrides, icon: iconOverrides },
      customItems
    );

    expect(Array.isArray(rebuilt)).toBe(true);
    const arr = rebuilt as unknown[];

    // Entity-only custom items must survive
    expect(arr).toContainEqual({ entity: "sensor.time" });
    expect(arr).toContainEqual({
      entity: "sensor.wash",
      icon: "mdi:abacus",
      label: "kokkeli",
    });

    // Known items must survive
    expect(arr).toContain("wind_speed");
    const humidityItem = arr.find(
      (item) =>
        typeof item === "object" &&
        (item as { name?: string }).name === "humidity"
    ) as { name: string; entity: string; label: string } | undefined;
    expect(humidityItem).toBeDefined();
    expect(humidityItem?.entity).toBe("sensor.my_hum");
    expect(humidityItem?.label).toBe("Hum");
  });
});

describe("extractKnownItems", () => {
  it("expands true to all 10 known attributes", () => {
    expect(extractKnownItems(true)).toEqual([...CURRENT_WEATHER_ATTRIBUTES]);
  });

  it("returns known strings and known objects, excludes custom", () => {
    const result = extractKnownItems(workedExampleShowAttributes);
    expect(result).toHaveLength(2);
    expect(result).toContain("wind_speed");
    expect(result).toContainEqual({
      name: "humidity",
      entity: "sensor.my_hum",
      label: "Hum",
    });
    expect(
      result.some(
        (item) =>
          typeof item === "object" &&
          (item as { entity?: string }).entity === "sensor.time"
      )
    ).toBe(false);
  });

  it("returns the single known string", () => {
    expect(extractKnownItems("humidity")).toEqual(["humidity"]);
  });

  it("returns [] for an unknown string, false and undefined", () => {
    expect(extractKnownItems("soil_moisture")).toEqual([]);
    expect(extractKnownItems(false)).toEqual([]);
    expect(extractKnownItems(undefined)).toEqual([]);
  });

  it("drops null entries", () => {
    expect(extractKnownItems([null, "humidity"])).toEqual(["humidity"]);
  });
});

describe("custom entity attributes editor merge (add/remove)", () => {
  it("partitions every item into exactly one of known or custom", () => {
    const known = extractKnownItems(workedExampleShowAttributes);
    const custom = extractCustomAttributes(workedExampleShowAttributes);
    expect(known.length + custom.length).toBe(
      workedExampleShowAttributes.length
    );
  });

  it("adding a blank custom row keeps known and existing custom items", () => {
    const known = extractKnownItems(workedExampleShowAttributes);
    const custom = [
      ...extractCustomAttributes(workedExampleShowAttributes),
      {},
    ];
    const merged = [...known, ...custom];

    expect(merged).toContain("wind_speed");
    expect(merged).toContainEqual({ entity: "sensor.time" });
    expect(merged[merged.length - 1]).toEqual({});
  });

  it("removing a custom row keeps the rest intact", () => {
    const known = extractKnownItems(workedExampleShowAttributes);
    const custom = extractCustomAttributes(workedExampleShowAttributes);
    custom.splice(0, 1); // remove sensor.time
    const merged = [...known, ...custom];

    expect(
      merged.some(
        (item) =>
          typeof item === "object" &&
          (item as { entity?: string }).entity === "sensor.time"
      )
    ).toBe(false);
    expect(merged).toContain("wind_speed");
    expect(merged).toContainEqual({
      entity: "sensor.wash",
      icon: "mdi:abacus",
      label: "kokkeli",
    });
  });
});

describe("rebuildShowAttributesWithCustom", () => {
  it("restores the compact `true` form after adding then removing a custom row", () => {
    // Start from "all known attributes".
    let showAttributes: unknown = true;

    // Add a blank custom row.
    showAttributes = rebuildShowAttributesWithCustom(showAttributes, [
      ...extractCustomAttributes(showAttributes),
      {},
    ]);
    expect(Array.isArray(showAttributes)).toBe(true);

    // Remove it again — should canonicalize back to `true`, not an expanded array.
    showAttributes = rebuildShowAttributesWithCustom(
      showAttributes,
      extractCustomAttributes(showAttributes).filter((_, i) => i !== 0)
    );
    expect(showAttributes).toBe(true);
  });

  it("preserves known overrides and custom items", () => {
    const result = rebuildShowAttributesWithCustom(
      workedExampleShowAttributes,
      extractCustomAttributes(workedExampleShowAttributes)
    );

    expect(Array.isArray(result)).toBe(true);
    const arr = result as unknown[];
    expect(arr).toContain("wind_speed");
    expect(arr).toContainEqual({
      name: "humidity",
      entity: "sensor.my_hum",
      label: "Hum",
    });
    expect(arr).toContainEqual({ entity: "sensor.time" });
    expect(arr).toContainEqual({
      entity: "sensor.wash",
      icon: "mdi:abacus",
      label: "kokkeli",
    });
  });
});
