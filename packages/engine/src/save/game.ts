import { createSimulation, type Simulation, type System } from "../core";
import type { ScenarioConfig } from "../scenario";
import { parseSave, restoreWorld } from "./serialize";
import type { SaveWorld } from "./types";

export interface LoadedGame {
  simulation: Simulation<SaveWorld>;
  scenario: ScenarioConfig;
}

/**
 * Restores a run from a save file: same world, same step, same stream states, so it continues
 * as the uninterrupted run would (D-02). `systems` must be the same ordered list as when saving.
 */
export const loadGame = (json: string, systems: readonly System<SaveWorld>[]): LoadedGame => {
  const save = parseSave(json);
  const simulation = createSimulation({
    seed: save.scenario.seed,
    state: restoreWorld(save),
    systems,
    resume: { step: save.clock.step, prng: save.prng },
  });
  return { simulation, scenario: save.scenario };
};
