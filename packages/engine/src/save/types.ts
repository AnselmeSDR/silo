import type { SimulationSnapshot } from "../core";
import type { Movement, MovementWorld } from "../movement";
import type { Needs } from "../needs";
import type { Inhabitant } from "../population";
import type { ScenarioConfig } from "../scenario";
import type { SpatialModel } from "../spatial";
import type { Stocks, StocksWorld } from "../stocks";
import type { Assignment, WorkProfile } from "../work";

/** Current schema version of save files (D-04): one increment per schema change. */
export const FORMAT_VERSION = 1;
export const ENGINE_VERSION = "0.1.0";

/** The whole mutable state of a run. */
export interface SaveWorld extends MovementWorld, StocksWorld {
  needs: Needs;
  /** Work profile by inhabitant id. */
  profiles: Map<number, WorkProfile>;
  assignments: Assignment[];
}

/** Spatial model without the derived `links`, rebuilt on load. */
export type SavedSpatial = Omit<SpatialModel, "links">;

/** Save file content (D-04 minimal content, limited to what the engine has so far). */
export interface SaveFile {
  formatVersion: number;
  engineVersion: string;
  /** Scenario the run started from; its seed derives the PRNG streams. */
  scenario: ScenarioConfig;
  clock: { step: number };
  prng: SimulationSnapshot["prng"];
  world: { spatial: SavedSpatial };
  entities: { inhabitants: Inhabitant[] };
  movement: Movement;
  needs: Needs;
  work: { profiles: Record<number, WorkProfile>; assignments: Assignment[] };
  stocks: Stocks;
}

export class SaveError extends Error {
  constructor(readonly errors: string[]) {
    super(`Unusable save file:\n- ${errors.join("\n- ")}`);
    this.name = "SaveError";
  }
}
