import { describe, expect, it } from "vitest";
import { STEPS_PER_DAY, createSimulation, type System } from "../core";
import { buildSpatialModel } from "../spatial";
import {
  MAX_POPULATION,
  ageOf,
  createPopulation,
  getInhabitant,
  isAlive,
  killInhabitant,
  moveInhabitant,
  setHealth,
  type Population,
} from "./index";

const spatial = buildSpatialModel({ levels: 24, arteriesPerLevel: 6 });

describe("createPopulation", () => {
  it.each([30, 500, MAX_POPULATION])("creates %i inhabitants with stable ids", (count) => {
    const { inhabitants } = createPopulation(spatial, { count, seed: 1 });
    expect(inhabitants).toHaveLength(count);
    expect(inhabitants.map((i) => i.id)).toEqual([...inhabitants.keys()]);
  });

  it.each([0, 1.5, MAX_POPULATION + 1])("rejects count %s", (count) => {
    expect(() => createPopulation(spatial, { count, seed: 1 })).toThrow();
  });

  it("rejects a population that does not fit the housing", () => {
    const tiny = buildSpatialModel({ levels: 1, arteriesPerLevel: 1 });
    expect(() => createPopulation(tiny, { count: MAX_POPULATION, seed: 1 })).toThrow(/housing/);
  });

  it("is deterministic for a seed and differs across seeds", () => {
    const a = createPopulation(spatial, { count: 200, seed: 7 });
    expect(createPopulation(spatial, { count: 200, seed: 7 })).toEqual(a);
    expect(createPopulation(spatial, { count: 200, seed: 8 })).not.toEqual(a);
  });

  it("respects room capacity and starts at home", () => {
    const { inhabitants } = createPopulation(spatial, { count: MAX_POPULATION, seed: 3 });
    const perRoom = new Map<number, number>();
    for (const i of inhabitants) {
      expect(i.position).toBe(i.residence);
      perRoom.set(i.residence, (perRoom.get(i.residence) ?? 0) + 1);
    }
    for (const [room, n] of perRoom) {
      const node = spatial.nodes[room];
      expect(node?.kind === "room" && n <= node.capacity).toBe(true);
    }
  });

  it("draws ages close to the D-06 distribution", () => {
    const { inhabitants } = createPopulation(spatial, { count: MAX_POPULATION, seed: 5 });
    const share = (lo: number, hi: number) =>
      inhabitants.filter((i) => ageOf(i, 0) >= lo && ageOf(i, 0) <= hi).length / MAX_POPULATION;
    expect(share(0, 14)).toBeCloseTo(0.2, 1);
    expect(share(15, 39)).toBeCloseTo(0.4, 1);
    expect(share(40, 64)).toBeCloseTo(0.3, 1);
    expect(share(65, 90)).toBeCloseTo(0.1, 1);
  });
});

describe("ageOf", () => {
  it("ages one year every 360 days on the id-derived anniversary", () => {
    const population = createPopulation(spatial, { count: 50, seed: 2 });
    const i = getInhabitant(population, 10);
    const age = ageOf(i, 0);
    expect(ageOf(i, 359 - 10)).toBe(age);
    expect(ageOf(i, 360 - 10)).toBe(age + 1);
  });
});

describe("persistence", () => {
  it("keeps identity and state after the simulation runs, off screen", () => {
    const population = createPopulation(spatial, { count: 100, seed: 4 });
    const before = structuredClone(population);
    const idle: System<Population> = { name: "idle", update: () => {} };
    const sim = createSimulation({ seed: 4, state: population, systems: [idle] });
    for (let i = 0; i < 100; i++) sim.stepOnce();
    expect(sim.state).toEqual(before);
  });

  it("moves and updates health of a living inhabitant", () => {
    const population = createPopulation(spatial, { count: 40, seed: 1 });
    moveInhabitant(population, 3, 0);
    setHealth(population, 3, "ill");
    expect(getInhabitant(population, 3)).toMatchObject({ position: 0, health: "ill" });
  });

  it("keeps the entity after death and freezes it", () => {
    const population = createPopulation(spatial, { count: 40, seed: 1 });
    const { residence, position, birthDay } = getInhabitant(population, 5);
    const diedDay = 400;
    killInhabitant(population, 5, diedDay * STEPS_PER_DAY);
    expect(population.inhabitants).toHaveLength(40);
    const dead = getInhabitant(population, 5);
    expect(isAlive(dead)).toBe(false);
    expect(dead).toMatchObject({ id: 5, residence, position, birthDay, health: "dead" });
    expect(ageOf(dead, 5000)).toBe(ageOf(dead, diedDay));
    expect(() => moveInhabitant(population, 5, 0)).toThrow(/dead/);
    expect(() => setHealth(population, 5, "healthy")).toThrow(/dead/);
    killInhabitant(population, 5, 999999);
    expect(dead.diedAtStep).toBe(diedDay * STEPS_PER_DAY);
  });
});
