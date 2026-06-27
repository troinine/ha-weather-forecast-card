import { describe, expect, it } from "vitest";
import { HomeAssistant } from "custom-card-helpers";
import { getMoonPhaseInfo, moonLitPath, moonShadowPath } from "../src/helpers";

describe("moonShadowPath", () => {
  it("covers the whole disc at new moon (fraction 0)", () => {
    // terminator hugs the lit limb, so the unlit box fills the whole disc
    expect(moonShadowPath(0, true)).toBe(
      "M50 0 L-60 0 L-60 100 L50 100 A50.00 50 0 0 0 50 0 Z"
    );
  });

  it("collapses the shadow to nothing at full moon (fraction 1)", () => {
    // terminator hugs the unlit limb, so the clipped shadow has no area
    expect(moonShadowPath(1, true)).toBe(
      "M50 0 L-60 0 L-60 100 L50 100 A50.00 50 0 0 1 50 0 Z"
    );
  });

  it("keeps the shadow thin for a gibbous and wide for a crescent", () => {
    // Regression guard against an inverted terminator: a gibbous (mostly lit)
    // must use the opposite terminator sweep from a crescent (mostly shadowed).
    expect(moonShadowPath(0.8, true)).toContain("A30.00 50 0 0 1 50 0"); // gibbous
    expect(moonShadowPath(0.2, true)).toContain("A30.00 50 0 0 0 50 0"); // crescent
  });

  it("draws a straight terminator at the quarter (fraction 0.5)", () => {
    // rx collapses to 0, degenerating the terminator arc to a vertical line
    expect(moonShadowPath(0.5, true)).toContain("A0.00 50");
  });

  it("extends the unlit box past the limb on the correct side", () => {
    // waxing: unlit on the left (box to -60); waning: unlit on the right (160)
    expect(moonShadowPath(0.3, true)).toContain("L-60 0 L-60 100");
    expect(moonShadowPath(0.3, false)).toContain("L160 0 L160 100");
  });

  it("clamps fractions outside [0, 1]", () => {
    expect(moonShadowPath(-1, true)).toBe(moonShadowPath(0, true));
    expect(moonShadowPath(2, true)).toBe(moonShadowPath(1, true));
  });
});

describe("moonLitPath", () => {
  it("traces the full disc at full moon", () => {
    expect(moonLitPath(1, true)).toBe(
      "M50 0 A50 50 0 0 1 50 100 A50.00 50 0 0 1 50 0 Z"
    );
  });

  it("runs the lit limb on the opposite side from the unlit box", () => {
    // the glow traces the lit limb as an arc; the shadow boxes the unlit side
    expect(moonLitPath(0.3, true)).toContain("A50 50 0 0 1 50 100");
    expect(moonShadowPath(0.3, true)).toContain("L-60 0");
  });

  it("mirrors the lit limb between waxing and waning", () => {
    expect(moonLitPath(0.3, true)).toContain("A50 50 0 0 1 50 100");
    expect(moonLitPath(0.3, false)).toContain("A50 50 0 0 0 50 100");
  });

  it("clamps fractions outside [0, 1]", () => {
    expect(moonLitPath(-1, true)).toBe(moonLitPath(0, true));
    expect(moonLitPath(2, true)).toBe(moonLitPath(1, true));
  });
});

describe("getMoonPhaseInfo", () => {
  const date = new Date("2026-06-26T00:00:00Z");

  it("returns an illuminated fraction within [0, 1]", () => {
    const info = getMoonPhaseInfo(undefined, date);

    expect(info.fraction).toBeGreaterThanOrEqual(0);
    expect(info.fraction).toBeLessThanOrEqual(1);
  });

  it("flips the lit side for the southern hemisphere", () => {
    const north = getMoonPhaseInfo(
      { config: { latitude: 51 } } as unknown as HomeAssistant,
      date
    );
    const south = getMoonPhaseInfo(
      { config: { latitude: -33 } } as unknown as HomeAssistant,
      date
    );

    expect(north.litRight).toBe(!south.litRight);
  });
});
