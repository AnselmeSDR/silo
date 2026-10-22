import { describe, expect, it } from "vitest";
import { STEPS_PER_DAY, createSimulation } from "../core";
import { createMovement, movementSystem, type MovementWorld } from "../movement";
import { createPopulation } from "../population";
import { buildSpatialModel } from "../spatial";
import { addStock, createStocks, stocksSystem, verifyStocks } from "../stocks";
import { createWorkProfile, type WorkProfile } from "../work";
import {
  GAUGE_MAX,
  createNeeds,
  needsOf,
  needsSystem,
  productivityFactor,
  type NeedsWorld,
} from "./index";

const spatial = buildSpatialModel({ levels: 4, arteriesPerLevel: 4 });

const makeWorld = (count = 20): NeedsWorld => {
  const population = createPopulation(spatial, { count, seed: 1 });
  return { population, stocks: createStocks(), needs: createNeeds({ count, seed: 1 }) };
};

const run = (world: NeedsWorld, steps: number) => {
  const sim = createSimulation({ seed: 7, state: world, systems: [needsSystem, stocksSystem] });
  for (let i = 0; i < steps; i++) sim.stepOnce();
};

describe("unmet needs change behaviour", () => {
  it("an unsupplied inhabitant seeks, loses output, then cannot work and is marked absent", () => {
    const world = makeWorld(1);
    const profile = createWorkProfile();
    world.profiles = new Map<number, WorkProfile>([[0, profile]]);
    run(world, 600);
    const state = needsOf(world.needs, 0);
    expect(state.seeking).toBe("water");
    expect(productivityFactor(world.needs, 0)).toBeLessThan(1);
    run(world, STEPS_PER_DAY);
    expect(state.incapacitated).toBe(true);
    expect(productivityFactor(world.needs, 0)).toBe(0);
    expect(profile.absentUntilStep).not.toBeNull();
    expect(world.population.inhabitants[0]!.health).toBe("ill");
  });

  it("walks to a stock that has something left when movement is wired in", () => {
    const world = makeWorld(1);
    const home = world.population.inhabitants[0]!.residence;
    const far = spatial.nodes.find((n) => n.kind === "room" && n.id !== home)!.id;
    addStock(world.stocks, { node: far, kind: "water", capacity: 10_000_000, initial: 10_000_000 });
    addStock(world.stocks, { node: far, kind: "food", capacity: 10_000, initial: 10_000 });
    const full: NeedsWorld & MovementWorld = { ...world, spatial, movement: createMovement() };
    const sim = createSimulation<NeedsWorld & MovementWorld>({
      seed: 7,
      state: full,
      systems: [needsSystem, movementSystem, stocksSystem],
    });
    for (let i = 0; i < STEPS_PER_DAY; i++) sim.stepOnce();
    expect(world.stocks.totals.water.consumed).toBeGreaterThan(0);
    expect(full.movement.stats.completed).toBeGreaterThan(0);
  });
});

describe("consumption debits the real stocks", () => {
  it("withdraws water and food, keeps the balance exact and the gauges up", () => {
    const world = makeWorld(1);
    const home = world.population.inhabitants[0]!.residence;
    const water = addStock(world.stocks, {
      node: home,
      kind: "water",
      capacity: 100_000_000,
      initial: 100_000_000,
    });
    addStock(world.stocks, { node: home, kind: "food", capacity: 100_000, initial: 100_000 });
    run(world, 3 * STEPS_PER_DAY);
    const { totals } = world.stocks;
    // About 3 L and 2 000 kcal a day, give or take the individual metabolism.
    expect(totals.water.consumed).toBeGreaterThan(5_000_000);
    expect(totals.water.consumed).toBeLessThan(15_000_000);
    expect(totals.food.consumed).toBeGreaterThan(3_000);
    expect(world.stocks.stocks[water]!.available).toBe(100_000_000 - totals.water.consumed);
    expect(verifyStocks(world.stocks)).toEqual([]);
    expect(needsOf(world.needs, 0).gauges.water).toBeGreaterThan(0);
    expect(needsOf(world.needs, 0).incapacitated).toBe(false);
  });

  it("records the shortage when the stock runs dry, without any debt", () => {
    const world = makeWorld(1);
    const home = world.population.inhabitants[0]!.residence;
    addStock(world.stocks, { node: home, kind: "water", capacity: 1_000_000, initial: 1_000_000 });
    run(world, 2 * STEPS_PER_DAY);
    expect(world.stocks.stocks[0]!.available).toBe(0);
    expect(needsOf(world.needs, 0).gauges.water).toBeLessThan(GAUGE_MAX);
    expect(verifyStocks(world.stocks)).toEqual([]);
  });
});

describe("consequences vary by individual", () => {
  it("the same shortage hurts a fragile inhabitant more than a resilient one", () => {
    const world = makeWorld(2);
    needsOf(world.needs, 0).traits = { metabolism: 1000, resilience: 0 };
    needsOf(world.needs, 1).traits = { metabolism: 1000, resilience: 100 };
    run(world, 500);
    expect(productivityFactor(world.needs, 0)).toBeLessThan(productivityFactor(world.needs, 1));
    run(world, 150);
    expect(needsOf(world.needs, 0).incapacitated).toBe(true);
    expect(needsOf(world.needs, 1).incapacitated).toBe(false);
  });

  it("a faster metabolism empties the gauges sooner", () => {
    const world = makeWorld(2);
    needsOf(world.needs, 0).traits = { metabolism: 1200, resilience: 50 };
    needsOf(world.needs, 1).traits = { metabolism: 800, resilience: 50 };
    run(world, 200);
    expect(needsOf(world.needs, 0).gauges.water).toBeLessThan(needsOf(world.needs, 1).gauges.water);
  });

  it("draws different traits across the population, reproducibly", () => {
    const a = createNeeds({ count: 200, seed: 3 });
    const b = createNeeds({ count: 200, seed: 3 });
    expect(a).toEqual(b);
    expect(new Set(a.byInhabitant.map((n) => n.traits.resilience)).size).toBeGreaterThan(20);
  });
});
