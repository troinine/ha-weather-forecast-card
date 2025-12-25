import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("weather-forecast-card theme variables", () => {
  let cssContent: string;
  let animationCssContent: string;

  beforeEach(() => {
    // Read CSS files for variable verification
    cssContent = readFileSync(
      join(__dirname, "../src/weather-forecast-card.css"),
      "utf-8"
    );
    animationCssContent = readFileSync(
      join(__dirname, "../src/components/animation/wfc-animation.css"),
      "utf-8"
    );
  });

  /**
   * Helper function to test theme variable exists in CSS
   */
  function testThemeVariableInCSS(themeVar: string, internalVar: string): void {
    // Check that the internal variable is defined
    expect(cssContent, `--${internalVar} should be defined in CSS`).toContain(
      `--${internalVar}:`
    );

    // Check that it references the theme variable
    expect(
      cssContent,
      `--${internalVar} should reference --${themeVar}`
    ).toContain(`--${themeVar}`);
  }

  /**
   * Helper function to test theme variable exists in animation CSS
   */
  function testEffectVariableInCSS(
    themeVar: string,
    internalVar: string
  ): void {
    // Check that the internal variable is defined
    expect(
      animationCssContent,
      `--${internalVar} should be defined in animation CSS`
    ).toContain(`--${internalVar}:`);

    // Check that it references the theme variable
    expect(
      animationCssContent,
      `--${internalVar} should reference --${themeVar}`
    ).toContain(`--${themeVar}`);
  }

  describe("wind indicator theme variables", () => {
    it("should support weather-forecast-card-wind-low-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-wind-low-color",
        "wfc-wind-low"
      );
    });

    it("should support weather-forecast-card-wind-medium-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-wind-medium-color",
        "wfc-wind-medium"
      );
    });

    it("should support weather-forecast-card-wind-high-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-wind-high-color",
        "wfc-wind-high"
      );
    });
  });

  describe("chart theme variables", () => {
    it("should support weather-forecast-card-chart-temp-low-line-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-temp-low-line-color",
        "wfc-chart-temp-low-line-color"
      );
    });

    it("should support weather-forecast-card-chart-temp-high-line-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-temp-high-line-color",
        "wfc-chart-temp-high-line-color"
      );
    });

    it("should support weather-forecast-card-chart-label-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-label-color",
        "wfc-chart-label-color"
      );
    });

    it("should support weather-forecast-card-chart-temp-high-label-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-temp-high-label-color",
        "wfc-chart-temp-high-label-color"
      );
    });

    it("should support weather-forecast-card-chart-temp-low-label-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-temp-low-label-color",
        "wfc-chart-temp-low-label-color"
      );
    });

    it("should support weather-forecast-card-chart-precipitation-label-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-precipitation-label-color",
        "wfc-chart-precipitation-label-color"
      );
    });

    it("should support weather-forecast-card-chart-grid-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-chart-grid-color",
        "wfc-chart-grid-color"
      );
    });

    it("should support weather-forecast-card-precipitation-bar-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-precipitation-bar-color",
        "wfc-precipitation-bar-color"
      );
    });
  });

  describe("sunrise/sunset theme variables", () => {
    it("should support weather-forecast-card-sunrise-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-sunrise-color",
        "wfc-sunrise-color"
      );
    });

    it("should support weather-forecast-card-sunset-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-sunset-color",
        "wfc-sunset-color"
      );
    });
  });

  describe("day indicator theme variables", () => {
    it("should support weather-forecast-card-day-indicator-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-day-indicator-color",
        "wfc-day-indicator-color"
      );
    });

    it("should support weather-forecast-card-day-indicator-text-color", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-day-indicator-text-color",
        "wfc-day-indicator-text-color"
      );
    });
  });

  describe("icon size theme variables", () => {
    it("should support weather-forecast-card-current-conditions-icon-size", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-current-conditions-icon-size",
        "current-conditions-icon-size"
      );
    });

    it("should support weather-forecast-card-forecast-conditions-icon-size", () => {
      testThemeVariableInCSS(
        "weather-forecast-card-forecast-conditions-icon-size",
        "forecast-conditions-icon-size"
      );
    });
  });

  describe("weather effects theme variables", () => {
    it("should support weather-forecast-card-effects-sun-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-sun-color",
        "sun-color"
      );
    });

    it("should support weather-forecast-card-effects-sun-ray-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-sun-ray-color",
        "sun-ray-color"
      );
    });

    it("should support weather-forecast-card-effects-sun-size", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-sun-size",
        "sun-size"
      );
    });

    it("should support weather-forecast-card-effects-sun-spin-duration", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-sun-spin-duration",
        "sun-spin-duration"
      );
    });

    it("should support weather-forecast-card-effects-moon-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-moon-color",
        "moon-color"
      );
    });

    it("should support weather-forecast-card-effects-moon-size", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-moon-size",
        "moon-size"
      );
    });

    it("should support weather-forecast-card-effects-star-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-star-color",
        "star-color"
      );
    });

    it("should support weather-forecast-card-effects-snow-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-snow-color",
        "snow-color"
      );
    });

    it("should support weather-forecast-card-effects-rain-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-rain-color",
        "rain-color"
      );
    });

    it("should support weather-forecast-card-effects-drop-height", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-drop-height",
        "drop-height"
      );
    });

    it("should support weather-forecast-card-effects-sky-visibility", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-sky-visibility",
        "sky-visibility"
      );
    });

    it("should support weather-forecast-card-effects-clear-sky-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-clear-sky-color",
        "clear-sky-color"
      );
    });

    it("should support weather-forecast-card-effects-clear-sky-accent", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-clear-sky-accent",
        "clear-sky-accent"
      );
    });

    it("should support weather-forecast-card-effects-clear-sky-horizon", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-clear-sky-horizon",
        "clear-sky-horizon"
      );
    });

    it("should support weather-forecast-card-effects-clear-night-sky-color", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-clear-night-sky-color",
        "clear-night-sky-color"
      );
    });

    it("should support weather-forecast-card-effects-clear-night-sky-accent", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-clear-night-sky-accent",
        "clear-night-sky-accent"
      );
    });

    it("should support weather-forecast-card-effects-clear-night-horizon", () => {
      testEffectVariableInCSS(
        "weather-forecast-card-effects-clear-night-horizon",
        "clear-night-horizon"
      );
    });
  });

  describe("all theme variables coverage", () => {
    it("should test all 17 main theme variables in CSS file", () => {
      const allMainVariables = [
        "weather-forecast-card-wind-low-color",
        "weather-forecast-card-wind-medium-color",
        "weather-forecast-card-wind-high-color",
        "weather-forecast-card-chart-temp-low-line-color",
        "weather-forecast-card-chart-temp-high-line-color",
        "weather-forecast-card-chart-label-color",
        "weather-forecast-card-chart-temp-high-label-color",
        "weather-forecast-card-chart-temp-low-label-color",
        "weather-forecast-card-chart-precipitation-label-color",
        "weather-forecast-card-chart-grid-color",
        "weather-forecast-card-precipitation-bar-color",
        "weather-forecast-card-sunrise-color",
        "weather-forecast-card-sunset-color",
        "weather-forecast-card-day-indicator-color",
        "weather-forecast-card-day-indicator-text-color",
        "weather-forecast-card-current-conditions-icon-size",
        "weather-forecast-card-forecast-conditions-icon-size",
      ];

      expect(
        allMainVariables.length,
        "Should have 17 main theme variables in CSS file"
      ).toBe(17);
    });

    it("should test all 17 effects theme variables in animation CSS file", () => {
      const allEffectsThemeVariables = [
        "weather-forecast-card-effects-sun-color",
        "weather-forecast-card-effects-sun-ray-color",
        "weather-forecast-card-effects-sun-size",
        "weather-forecast-card-effects-sun-spin-duration",
        "weather-forecast-card-effects-moon-color",
        "weather-forecast-card-effects-moon-size",
        "weather-forecast-card-effects-star-color",
        "weather-forecast-card-effects-snow-color",
        "weather-forecast-card-effects-rain-color",
        "weather-forecast-card-effects-drop-height",
        "weather-forecast-card-effects-sky-visibility",
        "weather-forecast-card-effects-clear-sky-color",
        "weather-forecast-card-effects-clear-sky-accent",
        "weather-forecast-card-effects-clear-sky-horizon",
        "weather-forecast-card-effects-clear-night-sky-color",
        "weather-forecast-card-effects-clear-night-sky-accent",
        "weather-forecast-card-effects-clear-night-horizon",
      ];

      expect(
        allEffectsThemeVariables.length,
        "Should have 17 effects theme variables in animation CSS file"
      ).toBe(17);
    });
  });
});
