import { describe, expect, it } from "vitest";
import { createRng, diffStates, replay, statesEqual, type Rng } from "./index";

interface Toy {
  stock: number;
  log: number[];
}

const step = (state: Toy, rng: Rng): Toy => {
  const delta = Math.floor(rng.next() * 10);
  return { stock: state.stock + delta, log: [...state.log, delta] };
};

const run = (seed: number) =>
  replay<Toy>({ seed, ticks: 50, initial: { stock: 0, log: [] }, step });

describe("createRng", () => {
  it("yields floats in [0, 1)", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("replay", () => {
  it("is deterministic for a fixed seed", () => {
    expect(statesEqual(run(42), run(42))).toBe(true);
  });

  it("diverges for another seed", () => {
    expect(statesEqual(run(42), run(43))).toBe(false);
  });

  it("returns ticks + 1 states", () => {
    expect(run(1)).toHaveLength(51);
  });
});

describe("diffStates", () => {
  it("reports differing paths", () => {
    expect(diffStates({ a: { b: 1 }, c: [1, 2] }, { a: { b: 2 }, c: [1, 3] })).toEqual([
      "a.b",
      "c.1",
    ]);
  });

  it("reports nothing for equal states", () => {
    expect(diffStates({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual([]);
  });
});
