import type { Simulation } from "../core";
import type { ScenarioConfig } from "../scenario";
import { buildLinks } from "../spatial";
import { migrate } from "./migrate";
import { ENGINE_VERSION, FORMAT_VERSION, SaveError, type SaveFile, type SaveWorld } from "./types";
import { validateSave } from "./validate";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Deterministic JSON: sorted keys, and no NaN/Infinity (D-04). */
export const stringifyCanonical = (value: unknown): string =>
  JSON.stringify(value, (key, v: unknown) => {
    if (typeof v === "number" && !Number.isFinite(v)) {
      throw new Error(`cannot save a non-finite number at "${key}"`);
    }
    if (!isRecord(v)) return v;
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, v[k]]),
    );
  });

/** Captures the run as plain data; `scenario` is the config it started from. */
export const createSave = (sim: Simulation<SaveWorld>, scenario: ScenarioConfig): SaveFile => {
  const { spatial, population, movement, stocks, needs, profiles, assignments } = sim.state;
  const { levels, arteriesPerLevel, nodes, edges, revision } = spatial;
  const snapshot = sim.snapshot();
  return {
    formatVersion: FORMAT_VERSION,
    engineVersion: ENGINE_VERSION,
    scenario,
    clock: { step: snapshot.step },
    prng: snapshot.prng,
    world: { spatial: { levels, arteriesPerLevel, nodes, edges, revision } },
    entities: { inhabitants: population.inhabitants },
    // Passages used this step are reset at the start of the next one: not state.
    movement: { ...movement, usage: {} },
    needs,
    work: { profiles: Object.fromEntries(profiles), assignments },
    stocks,
  };
};

export const serializeSave = (sim: Simulation<SaveWorld>, scenario: ScenarioConfig): string =>
  stringifyCanonical(createSave(sim, scenario));

/** Parses, migrates and validates a save file; throws `SaveError` listing every problem. */
export const parseSave = (json: string): SaveFile => {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new SaveError(["not valid JSON"]);
  }
  const data = migrate(value);
  const errors = validateSave(data);
  if (errors.length > 0) throw new SaveError(errors);
  return data as SaveFile;
};

/** Rebuilds the world of a validated save (derived data such as links is recomputed). */
export const restoreWorld = (save: SaveFile): SaveWorld => {
  const { nodes, edges } = save.world.spatial;
  return {
    spatial: { ...save.world.spatial, links: buildLinks(nodes.length, edges) },
    population: { inhabitants: save.entities.inhabitants },
    movement: save.movement,
    needs: save.needs,
    profiles: new Map(Object.entries(save.work.profiles).map(([id, p]) => [Number(id), p])),
    assignments: save.work.assignments,
    stocks: save.stocks,
  };
};
