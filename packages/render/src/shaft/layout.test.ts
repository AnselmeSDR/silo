import { describe, expect, it } from "vitest";
import { starterSilo } from "@silo/engine";
import { SHAFT_DIMENSIONS as D, createShaftLayout } from "./layout";

describe("createShaftLayout", () => {
  it("derives levels, arteries and stair from the scenario topology", () => {
    const layout = createShaftLayout(starterSilo);
    expect(layout.levels).toBe(24);
    expect(layout.arteryAngles).toHaveLength(4);
    expect(layout.totalSteps).toBe(23 * D.stepsPerLevel);
  });

  it("makes the stair continuous: one level of rise per half turn, top to bottom", () => {
    const layout = createShaftLayout(starterSilo);
    expect(layout.stepAngle * D.stepsPerLevel).toBeCloseTo(Math.PI);
    const bottom = layout.topY - (layout.totalSteps / D.stepsPerLevel) * D.levelHeight;
    expect(bottom).toBeCloseTo(layout.levelY(23));
    expect(layout.levelY(23)).toBeCloseTo(0);
  });

  it("alternates bridges by half turn and follows a smaller topology", () => {
    const layout = createShaftLayout({
      ...starterSilo,
      topology: { levels: 12, arteriesPerLevel: 2 },
    });
    expect(layout.bridgeAngle(0)).toBe(0);
    expect(layout.bridgeAngle(1)).toBeCloseTo(Math.PI);
    expect(layout.arteryAngles).toEqual([0, Math.PI]);
    expect(layout.levels).toBe(12);
  });
});
