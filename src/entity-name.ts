import { HassEntity } from "home-assistant-js-websocket";
import { EntityName, ExtendedHomeAssistant } from "./types";

type HassWithEntityNames = ExtendedHomeAssistant & {
  formatEntityName: NonNullable<ExtendedHomeAssistant["formatEntityName"]>;
};

/**
 * `hass.formatEntityName` only accepts a card's `name` option (a user string, a
 * structured name, or undefined) from Home Assistant 2026.4. Earlier versions
 * expose the same helper with an incompatible signature, so a version check is
 * needed - and a `hass` can report a recent version without carrying the helper
 * at all (a test harness, or one that has not finished initialising), so both
 * checks are.
 */
export const supportsEntityNames = (
  hass: ExtendedHomeAssistant | undefined
): hass is HassWithEntityNames => {
  if (!hass || typeof hass.formatEntityName !== "function") {
    return false;
  }

  const [major, minor] = (hass.config?.version ?? "").split(".", 2);

  return Number(major) > 2026 || (Number(major) === 2026 && Number(minor) >= 4);
};

/**
 * Resolves a `name` option against the entity's registry context (entity,
 * device, area, floor). Falls back to the `friendly_name` attribute on older
 * Home Assistant versions, which cannot resolve a structured name.
 */
export const computeEntityName = (
  hass: ExtendedHomeAssistant | undefined,
  stateObj: HassEntity | undefined,
  name?: EntityName
): string | undefined => {
  if (typeof name === "string" && name) {
    return name;
  }

  if (!stateObj) {
    return undefined;
  }

  if (supportsEntityNames(hass)) {
    return hass.formatEntityName(stateObj, name);
  }

  return stateObj.attributes.friendly_name as string | undefined;
};
