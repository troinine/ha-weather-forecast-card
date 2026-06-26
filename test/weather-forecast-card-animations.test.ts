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
import { WeatherAnimationProvider } from "../src/components/animation/wfc-animation-provider";
import { ForecastAttribute, WeatherEntity } from "../src/data/weather";

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

    it("should render clouds and an overcast sky for cloudy weather", async () => {
      const element = await createFixture("cloudy", true);

      expect(queryAnimationAll(element, ".cloud").length).toBeGreaterThan(0);
      expect(queryAnimation(element, ".sky.overcast")).not.toBeNull();
      // Fully overcast: no sun or moon behind the cloud deck.
      expect(queryAnimation(element, ".sun")).toBeNull();
      expect(queryAnimation(element, ".moon")).toBeNull();
    });

    it("should render clouds, sky and sun for partly cloudy weather", async () => {
      const element = await createFixture("partlycloudy", true);

      expect(queryAnimationAll(element, ".cloud").length).toBeGreaterThan(0);
      expect(queryAnimation(element, ".sky")).not.toBeNull();
      expect(queryAnimation(element, ".sky.overcast")).toBeNull();
      expect(queryAnimation(element, ".sun")).not.toBeNull();
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

    it("should render clouds but no sky when only cloud is enabled", async () => {
      const element = await createFixture("cloudy", ["cloud"]);

      expect(queryAnimationAll(element, ".cloud").length).toBeGreaterThan(0);
      expect(queryAnimation(element, ".sky")).toBeNull();
    });

    it("should render the overcast sky but no clouds when only sky is enabled", async () => {
      const element = await createFixture("cloudy", ["sky"]);

      expect(queryAnimation(element, ".sky.overcast")).not.toBeNull();
      expect(queryAnimationAll(element, ".cloud").length).toBe(0);
    });

    it("should not render clouds for cloudy when cloud is not enabled", async () => {
      const element = await createFixture("cloudy", ["rain", "snow"]);

      expect(queryAnimationAll(element, ".cloud").length).toBe(0);
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

  describe("cloud stability", () => {
    it("should not regenerate clouds when the weather entity refreshes", async () => {
      const mockHass = new MockHass({ currentCondition: "cloudy" });
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const entity = hass.states["weather.demo"] as WeatherEntity;
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        show_condition_effects: true,
        forecast: { show_sun_times: false },
      };

      const provider = await fixture<WeatherAnimationProvider>(
        html`<wfc-animation-provider
          .hass=${hass}
          .config=${config}
          .weatherEntity=${entity}
        ></wfc-animation-provider>`
      );
      await provider.updateComplete;

      const before = cloudFingerprints(provider);
      expect(before.length).toBeGreaterThan(0);

      // A hass refresh hands the provider a new entity object (e.g. temperature
      // ticked) while the condition stays cloudy: clouds must not jump.
      provider.weatherEntity = {
        ...entity,
        attributes: { ...entity.attributes, temperature: 9 },
      } as WeatherEntity;
      await provider.updateComplete;

      expect(cloudFingerprints(provider)).toEqual(before);
    });
  });

  describe("cloud drift direction", () => {
    const driftsRight = async (windBearing: number): Promise<boolean> => {
      const mockHass = new MockHass({ currentCondition: "cloudy" });
      const hass = mockHass.getHass() as ExtendedHomeAssistant;
      const entity = hass.states["weather.demo"] as WeatherEntity;
      const config: WeatherForecastCardConfig = {
        type: "custom:weather-forecast-card",
        entity: "weather.demo",
        show_condition_effects: true,
        forecast: { show_sun_times: false },
      };
      const forecast = {
        datetime: "2026-01-01T00:00:00Z",
        wind_bearing: windBearing,
        wind_speed: 10,
      } as ForecastAttribute;

      const provider = await fixture<WeatherAnimationProvider>(
        html`<wfc-animation-provider
          .hass=${hass}
          .config=${config}
          .weatherEntity=${entity}
          .currentForecast=${forecast}
        ></wfc-animation-provider>`
      );
      await provider.updateComplete;

      return (
        provider.shadowRoot
          ?.querySelector(".cloud-track")
          ?.classList.contains("drift-right") ?? false
      );
    };

    it("drifts right when the wind blows toward the east (from the west)", async () => {
      expect(await driftsRight(270)).toBe(true);
    });

    it("drifts left when the wind blows toward the west (from the east)", async () => {
      expect(await driftsRight(90)).toBe(false);
    });
  });
});

const cloudFingerprints = (provider: WeatherAnimationProvider): string[] =>
  Array.from(provider.shadowRoot?.querySelectorAll(".cloud") ?? []).map(
    // Normalize whitespace: the serialized style string spacing can differ
    // between renders even when the values (positions/sizes) are identical.
    (el) =>
      `${el.className}|${(el.getAttribute("style") ?? "").replace(/\s+/g, "")}`
  );

const createFixture = async (
  condition: string,
  showConditionEffects: boolean | WeatherEffect[] = true
) => {
  const mockHass = new MockHass({ currentCondition: condition });
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
