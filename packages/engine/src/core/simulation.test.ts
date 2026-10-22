import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_STEPS_PER_ADVANCE,
  STEPS_PER_DAY,
  createSimulation,
  timeOfStep,
  type System,
} from "./index";

interface World {
  order: string[];
  walkers: number[];
  noise: number;
}

const makeWorld = (): World => ({ order: [], walkers: [], noise: 0 });

const systems: System<World>[] = [
  {
    name: "needs",
    update(w, { prng }) {
      w.order.push("needs");
      w.noise += prng.int(100);
    },
  },
  {
    name: "movement",
    update(w, { shuffle }) {
      w.order.push("movement");
      w.walkers.push(shuffle([1, 2, 3, 4, 5])[0] ?? 0);
    },
  },
  {
    name: "events",
    update(w, { prng }) {
      w.order.push("events");
      w.noise += prng.int(10);
    },
  },
];

const make = (seed = 11) => createSimulation({ seed, state: makeWorld(), systems });
const snapshot = (w: World) => JSON.stringify({ walkers: w.walkers, noise: w.noise });

describe("determinism", () => {
  const run = (seed: number) => {
    const sim = make(seed);
    for (let i = 0; i < 500; i++) sim.stepOnce();
    return snapshot(sim.state);
  };

  it("gives the same state for the same seed", () => {
    expect(run(7)).toBe(run(7));
  });

  it("gives another state for another seed", () => {
    expect(run(7)).not.toBe(run(8));
  });

  it("accepts a 64-bit seed", () => {
    const sim = createSimulation({ seed: 2n ** 63n + 5n, state: makeWorld(), systems });
    sim.stepOnce();
    expect(sim.time.step).toBe(1);
  });

  it("keeps a stream unchanged when another system is added", () => {
    type V = { v: number[] };
    const probe: System<V> = {
      name: "probe",
      update: (s, { prng }) => void s.v.push(prng.int(1000)),
    };
    const extra: System<V> = { name: "extra", update: (_s, { prng }) => void prng.next() };
    const draws = (list: System<V>[]) => {
      const sim = createSimulation({ seed: 3, state: { v: [] as number[] }, systems: list });
      for (let i = 0; i < 20; i++) sim.stepOnce();
      return sim.state.v;
    };
    expect(draws([probe])).toEqual(draws([extra, probe]));
  });
});

describe("resolution order", () => {
  it("runs systems in the declared order at every step", () => {
    const sim = make();
    sim.stepOnce();
    sim.stepOnce();
    expect(sim.systemOrder).toEqual(["needs", "movement", "events"]);
    expect(sim.state.order).toEqual(["needs", "movement", "events", "needs", "movement", "events"]);
  });

  it("follows a reordered list", () => {
    const sim = createSimulation({ seed: 1, state: makeWorld(), systems: [...systems].reverse() });
    sim.stepOnce();
    expect(sim.state.order).toEqual(["events", "movement", "needs"]);
  });

  it("rejects duplicate system names", () => {
    expect(() =>
      createSimulation({
        seed: 1,
        state: makeWorld(),
        systems: [...systems.slice(0, 1), ...systems.slice(0, 1)],
      }),
    ).toThrow("Duplicate");
  });

  it("shuffles inhabitants without a fixed priority", () => {
    const sim = make();
    for (let i = 0; i < 200; i++) sim.stepOnce();
    expect(new Set(sim.state.walkers).size).toBe(5);
  });
});

describe("pause and speeds", () => {
  it("does not change results across speeds and pauses", () => {
    const reference = make();
    for (let i = 0; i < 63; i++) reference.stepOnce();

    const mixed = make();
    mixed.speed = "pause";
    expect(mixed.advance(5000)).toBe(0);
    mixed.speed = "x100";
    mixed.advance(500); // 50 steps
    mixed.speed = "pause";
    mixed.advance(2000);
    mixed.speed = "x10";
    mixed.advance(1000); // 10 steps
    mixed.speed = "x1";
    mixed.advance(3000); // 3 steps

    expect(mixed.time.step).toBe(63);
    expect(snapshot(mixed.state)).toBe(snapshot(reference.state));
  });

  it("runs no step in pause", () => {
    const sim = make();
    sim.speed = "pause";
    expect(sim.advance(10_000)).toBe(0);
    expect(sim.time.step).toBe(0);
  });

  it("runs steps per real second matching the speed", () => {
    const sim = make();
    sim.speed = "x10";
    expect(sim.advance(1000)).toBe(10);
    sim.speed = "x100";
    expect(sim.advance(1000)).toBe(100);
  });
});

describe("step cap per advance", () => {
  it("slows down after a long sleep instead of catching up", () => {
    const sim = make();
    sim.speed = "x100";
    expect(sim.advance(10 * 60_000)).toBe(DEFAULT_MAX_STEPS_PER_ADVANCE);
    expect(sim.advance(0)).toBe(0);
    expect(sim.time.step).toBe(DEFAULT_MAX_STEPS_PER_ADVANCE);
  });

  it("caps a slow frame at x100 and honours a custom cap", () => {
    const sim = createSimulation({ seed: 1, state: makeWorld(), systems, maxStepsPerAdvance: 5 });
    sim.speed = "x100";
    expect(sim.advance(1000)).toBe(5);
    expect(sim.advance(20)).toBe(2);
  });

  it("never skips a step: capped run equals a plain run", () => {
    const capped = createSimulation({
      seed: 4,
      state: makeWorld(),
      systems,
      maxStepsPerAdvance: 3,
    });
    capped.speed = "x100";
    while (capped.time.step < 30) capped.advance(1000);
    const plain = createSimulation({ seed: 4, state: makeWorld(), systems });
    for (let i = 0; i < 30; i++) plain.stepOnce();
    expect(snapshot(capped.state)).toBe(snapshot(plain.state));
  });

  it("rejects an invalid cap", () => {
    expect(() =>
      createSimulation({ seed: 1, state: makeWorld(), systems, maxStepsPerAdvance: 0 }),
    ).toThrow("maxStepsPerAdvance");
  });
});

describe("clock", () => {
  it("derives time from the integer step", () => {
    const step = STEPS_PER_DAY * 361 + 61;
    expect(timeOfStep(step)).toEqual({ step, day: 361, year: 1, minuteOfDay: 61 });
  });
});
