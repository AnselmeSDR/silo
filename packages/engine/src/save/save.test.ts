import { describe, expect, it } from "vitest";
import { createSimulation } from "../core";
import { createMovement, movementSystem, requestTrip } from "../movement";
import { createNeeds, needsSystem } from "../needs";
import { createPopulation } from "../population";
import { buildScenarioModel, starterSilo } from "../scenario";
import { rooms, setServiceState } from "../spatial";
import { addStock, createStocks, deposit, reserve, stocksSystem } from "../stocks";
import { createAssignment, createWorkProfile, sectorOfRoom } from "../work";
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

const systems = [needsSystem, movementSystem, stocksSystem];

const newGame = () => {
  const spatial = buildScenarioModel(config);
  const stocks = createStocks();
  const world: SaveWorld = {
    spatial,
    population: createPopulation(spatial, { count: 300, seed: config.seed }),
    movement: createMovement(),
    stocks,
    needs: createNeeds({ count: 300, seed: config.seed }),
    profiles: new Map([[3, createWorkProfile({ willingness: 40, skills: { farming: 55 } })]]),
    assignments: [],
  };
  const post = rooms(spatial).find((r) => sectorOfRoom(config, r) === "agriculture");
  if (post) {
    world.assignments.push(
      createAssignment(spatial, config, world.population, 3, "farmer", post.id, {
        startMinute: 360,
        durationMin: 480,
      }),
    );
  }
  const tank = addStock(stocks, {
    node: 1,
    kind: "water",
    capacity: 1000,
    initial: 500,
    lossPerStep: 3,
  });
  deposit(stocks, tank, 100);
  reserve(stocks, tank, 50);
  const sim = createSimulation<SaveWorld>({
    seed: config.seed,
    state: world,
    systems,
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
    for (let i = 0; i < 3; i++) {
      straight.stepOnce();
      saved.stepOnce();
    }
    expect(Object.keys(saved.state.movement.trips).length).toBeGreaterThan(0);
    const { simulation: loaded } = loadGame(serializeSave(saved, config), systems);
    for (let i = 0; i < 60; i++) {
      straight.stepOnce();
      loaded.stepOnce();
    }
    expect(loaded.time.step).toBe(63);
    expect(stateOf(loaded)).toBe(stateOf(straight));
  });

  it("round-trips needs, stocks, reservations, profiles and assignments unchanged", () => {
    const sim = newGame();
    for (let i = 0; i < 3; i++) sim.stepOnce();
    const text = serializeSave(sim, config);
    const { simulation } = loadGame(text, systems);
    expect(serializeSave(simulation, config)).toBe(text);
    expect(Object.keys(JSON.parse(text).movement.trips).length).toBeGreaterThan(0);
    expect(Object.keys(JSON.parse(text).stocks.reservations)).toHaveLength(1);
    expect(simulation.state.profiles.get(3)?.skills).toEqual({ farming: 55 });
  });

  it("keeps service states and the spatial revision", () => {
    const sim = newGame();
    const room = rooms(sim.state.spatial)[3]!;
    setServiceState(sim.state.spatial, room.id, "inaccessible");
    const { simulation } = loadGame(serializeSave(sim, config), systems);
    expect(simulation.state.spatial.revision).toBe(sim.state.spatial.revision);
    expect(rooms(simulation.state.spatial)[3]!.service).toBe("inaccessible");
  });

  it("writes the same text for the same state (sorted keys)", () => {
    const sim = newGame();
    sim.stepOnce();
    const text = serializeSave(sim, config);
    expect(serializeSave(loadGame(text, systems).simulation, config)).toBe(
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
    data.stocks.stocks[0].node = 999_999;
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
      "stocks.stocks[0].node must be an existing node",
    ]);
  });
});
