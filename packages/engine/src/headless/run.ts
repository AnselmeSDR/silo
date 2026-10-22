import { STEPS_PER_DAY } from "../core";
import { createObserver, type Summary } from "../observation";
import type { ScenarioConfig } from "../scenario";
import { createScenarioSimulation } from "../world";

/** Runs a scenario for `days` simulated days with no DOM, no Three.js, no real-time clock. */
export const runHeadless = (config: ScenarioConfig, days: number): Summary => {
  if (!Number.isInteger(days) || days < 0) throw new Error("days must be an integer >= 0");
  const sim = createScenarioSimulation(config);
  for (let i = 0; i < days * STEPS_PER_DAY; i++) sim.stepOnce();
  return createObserver(sim).summary();
};

export const formatSummary = (name: string, s: Summary): string =>
  [
    `scenario ${name}: day ${s.time.day} (step ${s.time.step})`,
    `population: ${s.population.alive}/${s.population.total} alive, ${s.population.dead} dead, ${s.population.travelling} travelling`,
    `movement: ${s.movement.completed} trips completed, ${s.movement.abandoned} abandoned, ${s.movement.waitedSteps} waited steps`,
    `stocks: ${Object.entries(s.stocks)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
    `produced: ${Object.entries(s.production.produced)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
    `consumed: ${Object.entries(s.production.consumed)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
    ...s.production.machines.map((m) => `machine ${m.label}: ${m.status}, ${m.completed} batches`),
  ].join("\n");
