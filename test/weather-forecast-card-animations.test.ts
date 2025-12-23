import { describe, expect, it } from "vitest";
import { fixture } from "@open-wc/testing";
import { html } from "lit";
import { MockHass } from "./mocks/hass";
import {
  ExtendedHomeAssistant,
  WeatherEffect,
  WeatherForecastCardConfig,
} from "../src/types";
import { WeatherForecastCard } from "../src/weather-forecast-card";

import "../src/index";

describe("weather-forecast-card-animations", () => {
  describe("show_condition_effects: false", () => {
    it("should not render any effects when disabled", async () => {
      const element = await createFixture("sunny", false);

      expect(queryAnimation(element, ".sky")).toBeNull();
      expect(queryAnimation(element, ".sun")).toBeNull();
      expect(queryAnimation(element, ".raindrop-path")).toBeNull();
    });
  });

  describe("show_condition_effects: true (all enabled)", () => {
    it("should render sky and sun for sunny weather", async () => {
      const element = await createFixture("sunny", true);

      expect(queryAnimation(element, ".sky")).not.toBeNull();
      expect(queryAnimation(element, ".sun")).not.toBeNull();
    });

    it("should render sky, night-sky and moon for clear-night weather", async () => {
      const element = await createFixture("clear-night", true);

      expect(queryAnimation(element, ".sky")).toBeNull();
      expect(queryAnimation(element, ".night-sky")).not.toBeNull();
      expect(queryAnimation(element, ".moon")).not.toBeNull();
      expect(queryAnimationAll(element, ".star").length).toBeGreaterThan(1);
    });

    it("should render rain for rainy weather", async () => {
      const element = await createFixture("rainy", true);

      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });

    it("should render rain for pouring weather", async () => {
      const element = await createFixture("pouring", true);

      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });

    it("should render lightning for lightning weather", async () => {
      const element = await createFixture("lightning", true);

      expect(queryAnimation(element, ".lightning-flash")).not.toBeNull();
    });

    it("should render lightning and rain for lightning-rainy weather", async () => {
      const element = await createFixture("lightning-rainy", true);

      expect(queryAnimation(element, ".lightning-flash")).not.toBeNull();
      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });

    it("should render snow for snowy weather", async () => {
      const element = await createFixture("snowy", true);

      expect(
        queryAnimationAll(element, ".snowflake-path").length
      ).toBeGreaterThan(1);
    });

    it("should render both snow and rain for snowy-rainy weather", async () => {
      const element = await createFixture("snowy-rainy", true);

      expect(
        queryAnimationAll(element, ".snowflake-path").length
      ).toBeGreaterThan(1);
      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });
  });

  describe("show_condition_effects: array (selective)", () => {
    it("should only render rain when rain is in array", async () => {
      const element = await createFixture("rainy", ["rain"]);

      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });

    it("should not render rain when rain is not in array", async () => {
      const element = await createFixture("rainy", ["snow", "lightning"]);

      expect(queryAnimation(element, ".raindrop-path")).toBeNull();
    });

    it("should render sky but not sun when only sky is enabled", async () => {
      const element = await createFixture("sunny", ["sky"]);

      expect(queryAnimation(element, ".sky")).not.toBeNull();
      expect(queryAnimation(element, ".sun")).toBeNull();
    });

    it("should render both sky and sun when both are enabled", async () => {
      const element = await createFixture("sunny", ["sky", "sun"]);

      expect(queryAnimation(element, ".sky")).not.toBeNull();
      expect(queryAnimation(element, ".sun")).not.toBeNull();
    });

    it("should render sky and moon when both are enabled for clear-night", async () => {
      const element = await createFixture("clear-night", ["sky", "moon"]);

      expect(queryAnimation(element, ".sky")).toBeNull();
      expect(queryAnimation(element, ".sun")).toBeNull();
      expect(queryAnimation(element, ".night-sky")).not.toBeNull();
      expect(queryAnimation(element, ".moon")).not.toBeNull();
    });

    it("should render only snow when snow is enabled", async () => {
      const element = await createFixture("snowy", ["snow"]);

      expect(
        queryAnimationAll(element, ".snowflake-path").length
      ).toBeGreaterThan(1);
    });

    it("should render only lightning when lightning is enabled", async () => {
      const element = await createFixture("lightning-rainy", ["lightning"]);

      expect(queryAnimation(element, ".lightning-flash")).not.toBeNull();
      expect(queryAnimation(element, ".raindrop-path")).toBeNull();
    });

    it("should render moon without sky when only moon is enabled", async () => {
      const element = await createFixture("clear-night", ["moon"]);

      expect(queryAnimation(element, ".moon")).not.toBeNull();
      expect(queryAnimationAll(element, ".star").length).toBeGreaterThan(1);
      expect(queryAnimation(element, ".sky")).toBeNull();
      expect(queryAnimation(element, ".night-sky")).toBeNull();
    });

    it("should render both snow and rain when both enabled for snowy-rainy", async () => {
      const element = await createFixture("snowy-rainy", ["snow", "rain"]);

      expect(
        queryAnimationAll(element, ".snowflake-path").length
      ).toBeGreaterThan(1);
      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });

    it("should render rain when only rain is enabled for snowy-rainy", async () => {
      const element = await createFixture("snowy-rainy", ["rain"]);

      expect(queryAnimationAll(element, ".snowflake-path").length).toBe(0);
      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });
  });

  describe("combined effect scenarios", () => {
    it("should render rain and lightning together", async () => {
      const element = await createFixture("lightning-rainy", [
        "lightning",
        "rain",
      ]);

      expect(queryAnimation(element, ".lightning-flash")).not.toBeNull();
      expect(
        queryAnimationAll(element, ".raindrop-path").length
      ).toBeGreaterThan(1);
    });

    it("should not render effects when empty array provided", async () => {
      const element = await createFixture("sunny", []);

      expect(queryAnimation(element, ".sky")).toBeNull();
      expect(queryAnimation(element, ".sun")).toBeNull();
    });
  });
});

const createFixture = async (
  condition: string,
  showConditionEffects: boolean | WeatherEffect[] = true
) => {
  const mockHass = new MockHass();
  mockHass.currentCondition = condition;
  const hass = mockHass.getHass() as ExtendedHomeAssistant;
  const config: WeatherForecastCardConfig = {
    type: "custom:weather-forecast-card",
    entity: "weather.demo",
    show_condition_effects: showConditionEffects,
    forecast: {
      show_sun_times: false,
    },
  };

  const element = await fixture<WeatherForecastCard>(
    html`<weather-forecast-card
      .hass=${hass}
      .config=${config}
    ></weather-forecast-card>`
  );

  element.setConfig(config);
  await element.updateComplete;

  return element;
};

const queryAnimation = (
  card: WeatherForecastCard,
  selector: string
): Element | null => {
  const animationProvider = card.shadowRoot?.querySelector(
    "wfc-animation-provider"
  );
  return animationProvider?.shadowRoot?.querySelector(selector) ?? null;
};

const queryAnimationAll = (
  card: WeatherForecastCard,
  selector: string
): NodeListOf<Element> | never[] => {
  const animationProvider = card.shadowRoot?.querySelector(
    "wfc-animation-provider"
  );
  return animationProvider?.shadowRoot?.querySelectorAll(selector) ?? [];
};
