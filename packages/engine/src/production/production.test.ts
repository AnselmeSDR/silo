import { describe, expect, it } from "vitest";
import { createSimulation, STEPS_PER_DAY } from "../core";
import { createPopulation, moveInhabitant } from "../population";
import { buildScenarioModel, starterSilo } from "../scenario";
import { rooms } from "../spatial";
import { addStock, createStocks, stocksSystem, totalOf, verifyStocks } from "../stocks";
import { createAssignment, createWorkProfile, sectorOfRoom, type WorkProfile } from "../work";
import {
  addMachine,
  createProduction,
  explainMachine,
  explainStock,
  productionSystem,
  type ProductionWorld,
} from "./index";

const config = starterSilo;
const spatial = buildScenarioModel(config);
const waterRoom = rooms(spatial).find((r) => sectorOfRoom(config, r) === "waterSanitation")!;
const shift = { startMinute: 480, durationMin: 480 };

interface Options {
  staffed?: boolean;
  skill?: number;
  energy?: number;
  working?: boolean;
  waterCapacity?: number;
}

/** A water treatment line with one operator (id 0) posted in its room. */
const makeWorld = ({
  staffed = true,
  skill = 80,
  energy = 100_000_000,
  working = true,
  waterCapacity = 10_000_000,
}: Options = {}) => {
  const population = createPopulation(spatial, { count: 30, seed: 1 });
  const world: ProductionWorld = {
    spatial,
    population,
    stocks: createStocks(),
    assignments: staffed
      ? [createAssignment(spatial, config, population, 0, "waterTechnician", waterRoom.id, shift)]
      : [],
    profiles: new Map<number, WorkProfile>([
      [0, createWorkProfile({ skills: { waterTreatment: skill } })],
    ]),
    production: createProduction(),
  };
  moveInhabitant(population, 0, waterRoom.id);
  const energyStock = addStock(world.stocks, {
    node: waterRoom.id,
    kind: "energy",
    capacity: 200_000_000,
    initial: energy,
  });
  const waterStock = addStock(world.stocks, {
    node: waterRoom.id,
    kind: "water",
    capacity: waterCapacity,
  });
  const machine = addMachine(world.stocks, world.production, {
    sheetId: "waterTreatment",
    room: waterRoom.id,
    inputStocks: { energy: energyStock },
    outputStock: waterStock,
    working,
  });
  const sim = createSimulation({
    seed: 5,
    state: world,
    systems: [productionSystem, stocksSystem],
  });
  return { world, sim, energyStock, waterStock, machine: world.production.machines[machine]! };
};

const runDay = (sim: ReturnType<typeof makeWorld>["sim"]) => {
  for (let i = 0; i < STEPS_PER_DAY; i++) {
    sim.stepOnce();
    expect(verifyStocks(sim.state.stocks)).toEqual([]);
  }
};

describe("operator", () => {
  it("lets a staffed machine produce during the working phase", () => {
    const { sim, world, machine } = makeWorld();
    runDay(sim);
    expect(machine.totals.completed).toBeGreaterThan(0);
    expect(totalOf(world.stocks, "water")).toBe(machine.totals.produced);
  });

  it("does not produce without an operator", () => {
    const { sim, world, machine } = makeWorld({ staffed: false });
    runDay(sim);
    expect(totalOf(world.stocks, "water")).toBe(0);
    expect(machine.totals.started).toBe(0);
    expect(machine.status).toBe("operator");
    expect(totalOf(world.stocks, "energy")).toBe(100_000_000);
  });

  it("does not produce when the operator has no real skill", () => {
    const { sim, world } = makeWorld({ skill: 0 });
    runDay(sim);
    expect(totalOf(world.stocks, "water")).toBe(0);
  });

  it("does not produce when the operator is away from the room", () => {
    const { sim, world } = makeWorld();
    const other = rooms(spatial).find((r) => r.id !== waterRoom.id)!;
    moveInhabitant(world.population, 0, other.id);
    runDay(sim);
    expect(totalOf(world.stocks, "water")).toBe(0);
  });

  it("does not produce when the equipment is out of service", () => {
    const { sim, world, machine } = makeWorld({ working: false });
    runDay(sim);
    expect(totalOf(world.stocks, "water")).toBe(0);
    expect(machine.status).toBe("equipment");
  });
});

describe("inputs", () => {
  it("consumes the inputs of every batch it starts", () => {
    const { sim, world, machine } = makeWorld();
    runDay(sim);
    const { consumed, produced } = world.stocks.totals.energy;
    expect(machine.totals.started).toBeGreaterThan(0);
    expect(consumed).toBe(machine.totals.started * 6_000_000);
    expect(totalOf(world.stocks, "energy")).toBe(100_000_000 - consumed + produced);
  });

  it("stops at the missing input and records why", () => {
    const { sim, world, machine } = makeWorld({ energy: 6_000_000 });
    runDay(sim);
    expect(machine.totals.started).toBe(1);
    expect(totalOf(world.stocks, "energy")).toBe(0);
    expect(machine.totals.blockedSteps.input).toBeGreaterThan(0);
  });

  it("stops when the output stock is full", () => {
    const { sim, world, machine } = makeWorld({ waterCapacity: 500_000 });
    runDay(sim);
    expect(machine.totals.completed).toBe(1);
    expect(totalOf(world.stocks, "water")).toBe(500_000);
    expect(machine.totals.wasted).toBe(0);
    expect(machine.totals.blockedSteps.outputFull).toBeGreaterThan(0);
  });
});

describe("explanation", () => {
  it("accounts for the initial stock and the flows of a machine", () => {
    const { sim, world, machine, energyStock } = makeWorld();
    runDay(sim);
    const text = explainMachine(machine).join("\n");
    expect(text).toContain("started");
    expect(text).toContain("no operator on duty");
    const { initial, consumed } = world.stocks.totals.energy;
    expect(initial).toBe(100_000_000);
    expect(explainStock(world.stocks, energyStock)).toMatch(/opening \d+ \+ in 0 - out \d+/);
    expect(world.stocks.stocks[energyStock]!.available).toBe(initial - consumed);
  });

  it("gives the same run for the same seed", () => {
    const a = makeWorld();
    const b = makeWorld();
    runDay(a.sim);
    runDay(b.sim);
    expect(a.machine.totals).toEqual(b.machine.totals);
  });
});

describe("sheets", () => {
  it("rejects a machine wired to the wrong stock kind", () => {
    const { world, waterStock } = makeWorld();
    expect(() =>
      addMachine(world.stocks, world.production, {
        sheetId: "waterTreatment",
        room: waterRoom.id,
        inputStocks: { energy: waterStock },
        outputStock: waterStock,
      }),
    ).toThrow(/energy stock as input/);
  });
});
