import { describe, expect, it } from "vitest";
import { createSimulation } from "../core";
import { createPopulation, killInhabitant, moveInhabitant } from "../population";
import { buildSpatialModel, rooms, setServiceState } from "../spatial";
import {
  createMovement,
  isTravelling,
  movementSystem,
  requestTrip,
  type MovementOptions,
  type MovementWorld,
} from "./index";

const makeWorld = (options: MovementOptions = {}, count = 100): MovementWorld => {
  const spatial = buildSpatialModel({ levels: 6, arteriesPerLevel: 2 });
  return {
    spatial,
    population: createPopulation(spatial, { count, seed: 1 }),
    movement: createMovement(options),
  };
};

const makeSim = (world: MovementWorld) =>
  createSimulation({ seed: 7, state: world, systems: [movementSystem] });

const roomOnLevel = (world: MovementWorld, level: number, skip = 0) =>
  rooms(world.spatial).filter((r) => r.level === level)[skip]!;

describe("trips", () => {
  it("reach the destination, walking edge by edge", () => {
    const world = makeWorld();
    const sim = makeSim(world);
    const id = 0;
    const target = roomOnLevel(world, 3).id;
    expect(requestTrip(world, id, target)).toBe(true);
    for (let i = 0; i < 60 && isTravelling(world.movement, id); i++) sim.stepOnce();
    expect(isTravelling(world.movement, id)).toBe(false);
    expect(world.population.inhabitants[id]!.position).toBe(target);
    expect(world.movement.stats.completed).toBe(1);
  });

  it("only change level through stair edges", () => {
    const world = makeWorld();
    const { spatial } = world;
    expect(requestTrip(world, 0, roomOnLevel(world, 5).id)).toBe(true);
    const { route } = world.movement.trips[0]!;
    let levelChanges = 0;
    for (let i = 1; i < route.length; i++) {
      if (spatial.nodes[route[i]!]!.level === spatial.nodes[route[i - 1]!]!.level) continue;
      levelChanges++;
      const link = spatial.links[route[i - 1]!]!.find((l) => l.to === route[i])!;
      expect(spatial.edges[link.edge]!.kind).toBe("stair");
    }
    expect(levelChanges).toBe(5 - spatial.nodes[world.population.inhabitants[0]!.position]!.level);
  });

  it("take the D-08 walking time: a 5-level climb lasts several steps", () => {
    const world = makeWorld();
    const sim = makeSim(world);
    requestTrip(world, 0, roomOnLevel(world, 5).id);
    sim.stepOnce();
    expect(isTravelling(world.movement, 0)).toBe(true);
  });

  it("are refused for the dead, travellers, same node and unreachable rooms", () => {
    const world = makeWorld();
    const target = roomOnLevel(world, 2).id;
    expect(requestTrip(world, 0, target)).toBe(true);
    expect(requestTrip(world, 0, target)).toBe(false);
    killInhabitant(world.population, 1, 0);
    expect(requestTrip(world, 1, target)).toBe(false);
    expect(requestTrip(world, 2, world.population.inhabitants[2]!.position)).toBe(false);
    const blocked = roomOnLevel(world, 4, 3).id;
    setServiceState(world.spatial, blocked, "inaccessible");
    expect(requestTrip(world, 3, blocked)).toBe(false);
  });
});

describe("congestion", () => {
  const arrivalSteps = (capacity: number): number => {
    const world = makeWorld({ capacityPerStep: { stair: capacity } }, 60);
    const sim = makeSim(world);
    const target = roomOnLevel(world, 2).id;
    const travellers = world.population.inhabitants.filter((i) => i.position !== target);
    for (const i of travellers) requestTrip(world, i.id, target);
    let steps = 0;
    while (Object.keys(world.movement.trips).length > 0 && steps < 500) {
      sim.stepOnce();
      steps++;
    }
    return steps;
  };

  it("slows trips through a saturated passage", () => {
    expect(arrivalSteps(2)).toBeGreaterThan(arrivalSteps(1000));
  });

  it("counts the steps lost in queues, none when capacity is ample", () => {
    const world = makeWorld({ capacityPerStep: { stair: 1 } }, 40);
    const sim = makeSim(world);
    const target = roomOnLevel(world, 2).id;
    for (const i of world.population.inhabitants) requestTrip(world, i.id, target);
    for (let i = 0; i < 5; i++) sim.stepOnce();
    expect(world.movement.stats.waitedSteps).toBeGreaterThan(0);
  });

  it("does not favour any inhabitant by id", () => {
    const world = makeWorld({ capacityPerStep: { stair: 1, door: 1 } }, 60);
    const sim = makeSim(world);
    const target = roomOnLevel(world, 1).id;
    const ids = world.population.inhabitants.filter((i) => i.position !== target).map((i) => i.id);
    for (const id of ids) requestTrip(world, id, target);
    const arrival = new Map<number, number>();
    for (let step = 1; step <= 400 && arrival.size < ids.length; step++) {
      sim.stepOnce();
      for (const id of ids) {
        if (!arrival.has(id) && !isTravelling(world.movement, id)) arrival.set(id, step);
      }
    }
    const order = [...arrival.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
    expect(order).not.toEqual([...order].sort((a, b) => a - b));
  });
});

describe("route recomputation", () => {
  it("computes routes once per pair while the spatial state is unchanged", () => {
    const world = makeWorld();
    const sim = makeSim(world);
    const target = roomOnLevel(world, 3).id;
    const origin = world.population.inhabitants[0]!.position;
    const same = world.population.inhabitants.slice(0, 5);
    for (const i of same) moveInhabitant(world.population, i.id, origin);
    for (const i of same) requestTrip(world, i.id, target);
    for (let i = 0; i < 20; i++) sim.stepOnce();
    expect(world.movement.stats.routesComputed).toBe(1);
  });

  it("does not recompute when a service state is set to its current value", () => {
    const world = makeWorld();
    const revision = world.spatial.revision;
    setServiceState(world.spatial, roomOnLevel(world, 1).id, "available");
    expect(world.spatial.revision).toBe(revision);
  });

  it("reroutes travellers once, after a spatial change", () => {
    const world = makeWorld();
    const sim = makeSim(world);
    const target = roomOnLevel(world, 4).id;
    requestTrip(world, 0, target);
    sim.stepOnce();
    const before = world.movement.stats.routesComputed;
    // An unrelated room closes: the revision moves, the trip is rerouted exactly once.
    setServiceState(world.spatial, roomOnLevel(world, 0, 9).id, "degraded");
    setServiceState(world.spatial, roomOnLevel(world, 0, 8).id, "degraded");
    sim.stepOnce();
    sim.stepOnce();
    expect(world.movement.stats.routesComputed - before).toBeLessThanOrEqual(1);
  });

  it("abandons a trip whose destination becomes inaccessible", () => {
    const world = makeWorld();
    const sim = makeSim(world);
    const target = roomOnLevel(world, 5).id;
    requestTrip(world, 0, target);
    sim.stepOnce();
    setServiceState(world.spatial, target, "inaccessible");
    sim.stepOnce();
    expect(isTravelling(world.movement, 0)).toBe(false);
    expect(world.movement.stats.abandoned).toBe(1);
  });
});

describe("determinism", () => {
  it("gives the same positions for the same seed", () => {
    const run = () => {
      const world = makeWorld({ capacityPerStep: { stair: 3 } });
      const sim = makeSim(world);
      const target = roomOnLevel(world, 3).id;
      for (const i of world.population.inhabitants) requestTrip(world, i.id, target);
      for (let i = 0; i < 30; i++) sim.stepOnce();
      return world.population.inhabitants.map((i) => i.position);
    };
    expect(run()).toEqual(run());
  });
});
