import type { ScenarioConfig } from "@silo/engine";

/** Reference dimensions of the silo in meters (D-08); the axis of the shaft is the origin. */
export const SHAFT_DIMENSIONS = {
  levelHeight: 4.2,
  slabThickness: 0.3,
  coreRadius: 2.65,
  stairInnerRadius: 2.8,
  stairOuterRadius: 6.7,
  stepsPerLevel: 30,
  parapetHeight: 1.1,
  shaftRadius: 12,
  wallRadius: 18.5,
  bridgeStart: 6.3,
  bridgeEnd: 12.8,
  bridgeWidth: 3.6,
  guardrailHeight: 0.95,
  arteryLength: 30,
  arteryWidth: 7.4,
  arteryHeight: 3.2,
} as const;

export interface ShaftLayout {
  levels: number;
  /** Angle of each artery around the axis, radians. */
  arteryAngles: number[];
  /** Floor height of level 0 (the top one); the bottom level is at 0. */
  topY: number;
  totalSteps: number;
  /** Angle of the stair per step: a half turn per level. */
  stepAngle: number;
  levelY: (level: number) => number;
  /** Angle of the bridge at a level: alternates 0 / 180 degrees. */
  bridgeAngle: (level: number) => number;
}

/** Derives the shaft layout from the scenario topology (D-08). */
export const createShaftLayout = (config: ScenarioConfig): ShaftLayout => {
  const { levels, arteriesPerLevel } = config.topology;
  const topY = (levels - 1) * SHAFT_DIMENSIONS.levelHeight;
  return {
    levels,
    arteryAngles: Array.from(
      { length: arteriesPerLevel },
      (_, i) => (i / arteriesPerLevel) * Math.PI * 2,
    ),
    topY,
    totalSteps: (levels - 1) * SHAFT_DIMENSIONS.stepsPerLevel,
    stepAngle: Math.PI / SHAFT_DIMENSIONS.stepsPerLevel,
    levelY: (level) => topY - level * SHAFT_DIMENSIONS.levelHeight,
    bridgeAngle: (level) => (level % 2) * Math.PI,
  };
};
