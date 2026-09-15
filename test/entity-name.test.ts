import { describe, expect, it, vi } from "vitest";
import { HassEntity } from "home-assistant-js-websocket";
import { computeEntityName } from "../src/entity-name";
import { EntityName, ExtendedHomeAssistant } from "../src/types";

const stateObj = {
  entity_id: "weather.demo",
  state: "sunny",
  attributes: { friendly_name: "Demo weather" },
} as unknown as HassEntity;

const hassWith = (
  version: string,
  formatEntityName?: (stateObj: HassEntity, name?: EntityName) => string
): ExtendedHomeAssistant =>
  ({
    config: { version },
    formatEntityName,
  }) as unknown as ExtendedHomeAssistant;

describe("computeEntityName", () => {
  it("returns a configured string as-is", () => {
    const format = vi.fn();

    expect(
      computeEntityName(hassWith("2026.4.0", format), stateObj, "Outside")
    ).toBe("Outside");
    expect(format).not.toHaveBeenCalled();
  });

  it("resolves through formatEntityName when supported", () => {
    const name: EntityName = [{ type: "area" }, { type: "entity" }];
    const format = vi.fn().mockReturnValue("Garden Demo weather");

    expect(
      computeEntityName(hassWith("2026.4.0", format), stateObj, name)
    ).toBe("Garden Demo weather");
    expect(format).toHaveBeenCalledWith(stateObj, name);
  });

  // formatEntityName takes a different, incompatible argument before 2026.4,
  // and a hass can report a recent version without carrying it at all.
  it.each([
    ["an older Home Assistant", hassWith("2026.3.0", vi.fn())],
    ["a hass without the helper", hassWith("2026.4.0")],
  ])("falls back to the friendly name on %s", (_label, hass) => {
    expect(computeEntityName(hass, stateObj, [{ type: "area" }])).toBe(
      "Demo weather"
    );
  });

  it("returns undefined without a state object", () => {
    expect(
      computeEntityName(hassWith("2026.4.0", vi.fn()), undefined)
    ).toBeUndefined();
  });
});
