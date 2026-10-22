import { describe, expect, it } from "vitest";
import { createSimulation, type System } from "../core";
import {
  addStock,
  consumeReservation,
  createStocks,
  deposit,
  freeOf,
  lose,
  releaseReservation,
  reserve,
  stocksSystem,
  totalOf,
  transfer,
  verifyStocks,
  withdraw,
  type StocksWorld,
} from "./index";

const makeWorld = (): StocksWorld => ({ stocks: createStocks() });

describe("conservation", () => {
  it("holds at every step under random flows, transfers and losses", () => {
    const world = makeWorld();
    const { stocks } = world;
    const ids = [0, 1, 2].map((node) =>
      addStock(stocks, { node, kind: "water", capacity: 1_000, initial: 500, lossPerStep: 3 }),
    );
    const flows: System<StocksWorld> = {
      name: "flows",
      update(_, { prng }) {
        const pick = () => ids[prng.int(ids.length)]!;
        deposit(stocks, pick(), prng.int(200));
        withdraw(stocks, pick(), prng.int(200));
        transfer(stocks, pick(), pick(), prng.int(300));
        const id = reserve(stocks, pick(), 1 + prng.int(50));
        if (id === null) return;
        if (prng.next() < 0.5) consumeReservation(stocks, id);
        else releaseReservation(stocks, id);
      },
    };
    const sim = createSimulation({ seed: 3, state: world, systems: [flows, stocksSystem] });
    for (let i = 0; i < 500; i++) {
      sim.stepOnce();
      expect(verifyStocks(stocks)).toEqual([]);
    }
    const { initial, produced, consumed, lost } = stocks.totals.water;
    expect(totalOf(stocks, "water")).toBe(initial + produced - consumed - lost);
    expect(lost).toBeGreaterThan(0);
  });

  it("detects a stock changed behind the API", () => {
    const world = makeWorld();
    const id = addStock(world.stocks, { node: 0, kind: "food", capacity: 100, initial: 10 });
    world.stocks.stocks[id]!.available += 5;
    expect(verifyStocks(world.stocks)).not.toEqual([]);
    const sim = createSimulation({ seed: 1, state: world, systems: [stocksSystem] });
    expect(() => sim.stepOnce()).toThrow();
  });
});

describe("reservations", () => {
  it("refuse a double allocation of the same quantity", () => {
    const { stocks } = makeWorld();
    const id = addStock(stocks, { node: 0, kind: "spareParts", capacity: 10, initial: 3 });
    expect(reserve(stocks, id, 2)).not.toBeNull();
    expect(reserve(stocks, id, 2)).toBeNull();
    expect(reserve(stocks, id, 1)).not.toBeNull();
    expect(freeOf(stocks.stocks[id]!)).toBe(0);
  });

  it("keep the quantity out of reach of withdrawals, losses and transfers", () => {
    const { stocks } = makeWorld();
    const a = addStock(stocks, { node: 0, kind: "water", capacity: 100, initial: 50 });
    const b = addStock(stocks, { node: 1, kind: "water", capacity: 100 });
    reserve(stocks, a, 40);
    expect(withdraw(stocks, a, 30)).toBe(10);
    expect(lose(stocks, a, 5)).toBe(0);
    expect(transfer(stocks, a, b, 5)).toBe(0);
    expect(stocks.totals.water.shortage).toBe(20);
  });

  it("give the quantity back when released, or consume it as promised", () => {
    const { stocks } = makeWorld();
    const id = addStock(stocks, { node: 0, kind: "food", capacity: 100, initial: 20 });
    const first = reserve(stocks, id, 15)!;
    releaseReservation(stocks, first);
    expect(freeOf(stocks.stocks[id]!)).toBe(20);
    const second = reserve(stocks, id, 15)!;
    expect(consumeReservation(stocks, second)).toBe(15);
    expect(stocks.stocks[id]!.available).toBe(5);
    expect(() => releaseReservation(stocks, second)).toThrow();
  });

  it("let the owner transfer its reserved quantity", () => {
    const { stocks } = makeWorld();
    const a = addStock(stocks, { node: 0, kind: "water", capacity: 100, initial: 50 });
    const b = addStock(stocks, { node: 1, kind: "water", capacity: 100 });
    const r = reserve(stocks, a, 30)!;
    expect(transfer(stocks, a, b, 30, r)).toBe(30);
    expect(stocks.reservations[r]).toBeUndefined();
    expect(verifyStocks(stocks)).toEqual([]);
  });
});

describe("full and empty stocks", () => {
  it("limit a transfer to what the source holds", () => {
    const { stocks } = makeWorld();
    const a = addStock(stocks, { node: 0, kind: "water", capacity: 100, initial: 10 });
    const b = addStock(stocks, { node: 1, kind: "water", capacity: 100 });
    expect(transfer(stocks, a, b, 50)).toBe(10);
    expect(transfer(stocks, a, b, 50)).toBe(0);
    expect(stocks.stocks[a]!.available).toBe(0);
  });

  it("limit a transfer to the room of the target", () => {
    const { stocks } = makeWorld();
    const a = addStock(stocks, { node: 0, kind: "water", capacity: 100, initial: 100 });
    const b = addStock(stocks, { node: 1, kind: "water", capacity: 100, initial: 90 });
    expect(transfer(stocks, a, b, 50)).toBe(10);
    expect(transfer(stocks, a, b, 50)).toBe(0);
    expect(stocks.stocks[b]!.available).toBe(100);
  });

  it("refuse the excess of a deposit and record the shortage of a withdrawal", () => {
    const { stocks } = makeWorld();
    const id = addStock(stocks, { node: 0, kind: "energy", capacity: 100, initial: 80 });
    expect(deposit(stocks, id, 50)).toBe(20);
    expect(withdraw(stocks, id, 130)).toBe(100);
    expect(stocks.totals.energy.shortage).toBe(30);
    expect(stocks.stocks[id]!.available).toBe(0);
  });

  it("never mix two kinds", () => {
    const { stocks } = makeWorld();
    const a = addStock(stocks, { node: 0, kind: "water", capacity: 10, initial: 5 });
    const b = addStock(stocks, { node: 0, kind: "food", capacity: 10 });
    expect(() => transfer(stocks, a, b, 1)).toThrow();
  });
});

describe("validation", () => {
  it("rejects non-integer or out-of-range quantities", () => {
    const { stocks } = makeWorld();
    expect(() => addStock(stocks, { node: 0, kind: "water", capacity: 0 })).toThrow();
    expect(() => addStock(stocks, { node: 0, kind: "water", capacity: 10, initial: 11 })).toThrow();
    const id = addStock(stocks, { node: 0, kind: "water", capacity: 10 });
    expect(() => deposit(stocks, id, 1.5)).toThrow();
    expect(() => reserve(stocks, id, 0)).toThrow();
  });
});
