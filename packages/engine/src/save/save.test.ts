import { describe, expect, it } from "vitest";
import { createSimulation } from "../core";
import { createMovement, movementSystem, requestTrip } from "../movement";
import { createPopulation } from "../population";
import { buildScenarioModel, starterSilo } from "../scenario";
import { rooms, setServiceState } from "../spatial";
import {
  FORMAT_VERSION,
  createSave,
  loadGame,
  parseSave,
  serializeSave,
  stringifyCanonical,
  SaveError,
  type SaveWorld,
} from "./index";

const config = { ...starterSilo, seed: 42, population: { ...starterSilo.population, total: 300 } };

const newGame = () => {
  const spatial = buildScenarioModel(config);
  const world: SaveWorld = {
    spatial,
    population: createPopulation(spatial, { count: 300, seed: config.seed }),
    movement: createMovement(),
    stocks: { ...config.stocks },
  };
  const sim = createSimulation<SaveWorld>({
    seed: config.seed,
    state: world,
    systems: [movementSystem],
  });
  const targets = rooms(spatial).filter((r) => r.level % 5 === 0);
  for (let id = 0; id < 200; id++) requestTrip(world, id, targets[(id * 7) % targets.length]!.id);
  return sim;
};

// The route cache counter is a performance metric: a loaded game starts with a cold cache.
const stateOf = (sim: ReturnType<typeof newGame>) => {
  const save = createSave(sim, config);
  save.movement = { ...save.movement, stats: { ...save.movement.stats, routesComputed: 0 } };
  return stringifyCanonical(save);
};

describe("save and load", () => {
  it("continues exactly like the uninterrupted run (fixed seed)", () => {
    const straight = newGame();
    const saved = newGame();
    for (let i = 0; i < 25; i++) {
      straight.stepOnce();
      saved.stepOnce();
    }
    const { simulation: loaded } = loadGame(serializeSave(saved, config), [movementSystem]);
    for (let i = 0; i < 60; i++) {
      straight.stepOnce();
      loaded.stepOnce();
    }
    expect(loaded.time.step).toBe(85);
    expect(stateOf(loaded)).toBe(stateOf(straight));
  });

  it("keeps service states and the spatial revision", () => {
    const sim = newGame();
    const room = rooms(sim.state.spatial)[3]!;
    setServiceState(sim.state.spatial, room.id, "inaccessible");
    const { simulation } = loadGame(serializeSave(sim, config), [movementSystem]);
    expect(simulation.state.spatial.revision).toBe(sim.state.spatial.revision);
    expect(rooms(simulation.state.spatial)[3]!.service).toBe("inaccessible");
  });

  it("writes the same text for the same state (sorted keys)", () => {
    const sim = newGame();
    sim.stepOnce();
    const text = serializeSave(sim, config);
    expect(serializeSave(loadGame(text, [movementSystem]).simulation, config)).toBe(
      serializeSave(sim, config),
    );
  });
});

describe("format", () => {
  it("is versioned", () => {
    const sim = newGame();
    expect(JSON.parse(serializeSave(sim, config)).formatVersion).toBe(FORMAT_VERSION);
  });

  it("refuses a newer format, naming both versions", () => {
    const data = JSON.parse(serializeSave(newGame(), config));
    data.formatVersion = FORMAT_VERSION + 1;
    expect(() => parseSave(JSON.stringify(data))).toThrow(/newer than this engine/);
  });

  it("refuses a file without a version, or not JSON, or not a save", () => {
    expect(() => parseSave("{nope")).toThrow(/not valid JSON/);
    expect(() => parseSave("[]")).toThrow(/JSON object/);
    expect(() => parseSave("{}")).toThrow(/not a Silo save/);
  });

  it("lists every structural problem of a damaged file", () => {
    const data = JSON.parse(serializeSave(newGame(), config));
    data.prng.movement = [1, 2, 3];
    data.entities.inhabitants[5].position = 999_999;
    data.stocks.waterMl = -1;
    const error = (() => {
      try {
        parseSave(JSON.stringify(data));
      } catch (e) {
        return e as SaveError;
      }
    })();
    expect(error).toBeInstanceOf(SaveError);
    expect(error!.errors).toEqual([
      "prng.movement must be 4 unsigned 32-bit integers",
      "entities.inhabitants[5].position must be an existing node",
      "stocks.waterMl must be an integer >= 0",
    ]);
  });
});
