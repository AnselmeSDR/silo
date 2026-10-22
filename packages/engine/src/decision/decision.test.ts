import { describe, expect, it } from "vitest";
import { createSimulation } from "../core";
import { createMovement, movementSystem } from "../movement";
import { GAUGE_MAX, createNeeds, needsOf, needsSystem } from "../needs";
import { createPopulation } from "../population";
import { buildSpatialModel, setServiceState } from "../spatial";
import { addStock, createStocks, stocksSystem } from "../stocks";
import { createWorkProfile, type Assignment } from "../work";
import { commit, createDecisions, decisionSystem, evaluate, type DecisionWorld } from "./index";

const spatial = buildSpatialModel({ levels: 4, arteriesPerLevel: 4 });
const rooms = spatial.nodes.filter((n) => n.kind === "room");

const makeWorld = (count = 1): DecisionWorld => ({
  spatial,
  population: createPopulation(spatial, { count, seed: 1 }),
  movement: createMovement(),
  stocks: createStocks(),
  needs: createNeeds({ count, seed: 1 }),
  decisions: createDecisions(),
});

const farRoom = (world: DecisionWorld, id = 0): number =>
  rooms.find((r) => r.id !== world.population.inhabitants[id]!.residence)!.id;

const supply = (world: DecisionWorld, node: number): void => {
  addStock(world.stocks, { node, kind: "water", capacity: 10_000_000, initial: 10_000_000 });
  addStock(world.stocks, { node, kind: "food", capacity: 10_000, initial: 10_000 });
};

const post = (world: DecisionWorld): Assignment => ({
  inhabitantId: 0,
  professionId: "test",
  room: farRoom(world),
  shift: { startMinute: 480, durationMin: 480 },
});

const simulate = (world: DecisionWorld, steps: number, seed = 7) => {
  const sim = createSimulation<DecisionWorld>({
    seed,
    state: world,
    systems: [needsSystem, decisionSystem, movementSystem, stocksSystem],
  });
  for (let i = 0; i < steps; i++) sim.stepOnce();
  return sim;
};

describe("choice by needs and commitments", () => {
  it("prefers the commitment when satisfied, an urgent need when not", () => {
    const world = makeWorld();
    commit(world.decisions, post(world));
    expect(evaluate(world, 0, 500)[0]!.action).toBe("work");
    expect(evaluate(world, 0, 100)[0]!.action).toBe("idle");

    supply(world, farRoom(world));
    needsOf(world.needs, 0).gauges.water = 1_000;
    const [best] = evaluate(world, 0, 500);
    expect(best!.action).toBe("drink");
    expect(best!.target).toBe(farRoom(world));
  });

  it("goes to work at shift time and drinks first when thirsty", () => {
    const world = makeWorld();
    const assignment = post(world);
    supply(world, world.population.inhabitants[0]!.residence);
    commit(world.decisions, assignment);
    simulate(world, 520);
    expect(world.population.inhabitants[0]!.position).toBe(assignment.room);
    expect(world.decisions.last[0]!.action).toBe("work");
    expect(world.decisions.last[0]!.result).toBe("success");
    expect(needsOf(world.needs, 0).gauges.water).toBeGreaterThan(0);
  });
});

describe("an impossible action fails with a recorded cause", () => {
  it("thirsty with no water anywhere: no-resource", () => {
    const world = makeWorld();
    simulate(world, 600);
    expect(world.decisions.last[0]).toMatchObject({
      action: "drink",
      result: "failed",
      cause: "no-resource",
    });
    expect(world.decisions.failureCounts["no-resource"]).toBeGreaterThan(0);
    expect(world.decisions.failures[0]).toMatchObject({ inhabitant: 0, cause: "no-resource" });
  });

  it("logs a failure once, not at every step", () => {
    const world = makeWorld();
    simulate(world, 700);
    const drinks = world.decisions.failures.filter((f) => f.action === "drink");
    expect(drinks).toHaveLength(1);
  });

  it("absent from a post: absent, and nothing moves", () => {
    const world = makeWorld();
    world.profiles = new Map([[0, createWorkProfile({ absentUntilStep: 10_000 })]]);
    supply(world, world.population.inhabitants[0]!.residence);
    commit(world.decisions, post(world));
    simulate(world, 520);
    expect(world.decisions.last[0]).toMatchObject({ action: "work", cause: "absent" });
    expect(world.population.inhabitants[0]!.position).toBe(
      world.population.inhabitants[0]!.residence,
    );
  });

  it("post cut off from home: unreachable", () => {
    const world = makeWorld();
    const assignment = post(world);
    supply(world, world.population.inhabitants[0]!.residence);
    commit(world.decisions, assignment);
    needsOf(world.needs, 0).gauges.health = GAUGE_MAX;
    setServiceState(world.spatial, assignment.room, "inaccessible");
    simulate(world, 520);
    expect(world.decisions.last[0]).toMatchObject({ action: "work", cause: "unreachable" });
  });
});

describe("determinism", () => {
  const trace = (seed: number) => {
    const world = makeWorld(30);
    supply(world, rooms[3]!.id);
    for (let id = 0; id < 30; id++) {
      commit(world.decisions, { ...post(world), inhabitantId: id, room: rooms[(id % 7) + 1]!.id });
    }
    simulate(world, 1_500, seed);
    return JSON.stringify({
      last: world.decisions.last,
      failures: world.decisions.failures,
      positions: world.population.inhabitants.map((i) => i.position),
    });
  };

  it("same seed, same behaviour", () => {
    expect(trace(7)).toBe(trace(7));
  });
});
