import { createSimulation, type Simulation } from "../core";
import { createMovement, movementSystem, type MovementWorld } from "../movement";
import { createPopulation } from "../population";
import { buildScenarioModel, type InitialStocks, type ScenarioConfig } from "../scenario";

/** The whole mutable state of a run. */
export interface World extends MovementWorld {
  stocks: InitialStocks;
}

export const createWorld = (config: ScenarioConfig): World => {
  const spatial = buildScenarioModel(config);
  return {
    spatial,
    population: createPopulation(spatial, { count: config.population.total, seed: config.seed }),
    movement: createMovement(),
    stocks: { ...config.stocks },
  };
};

/** Simulation of a validated scenario, ready to step with no rendering. */
export const createScenarioSimulation = (config: ScenarioConfig): Simulation<World> =>
  createSimulation<World>({
    seed: config.seed,
    state: createWorld(config),
    systems: [movementSystem],
  });
