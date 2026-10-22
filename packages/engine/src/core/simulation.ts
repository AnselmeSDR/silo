import { SPEEDS, timeOfStep, type SimTime, type Speed } from "./clock";
import { createPrngFromState, createStream, shuffle, type Prng, type PrngState } from "./prng";

export interface SystemContext {
  step: number;
  /** The system's own stream, independent from the others. */
  prng: Prng;
  /** Shuffles inhabitants with the system stream (no id-based priority). */
  shuffle: <T>(items: readonly T[]) => T[];
}

export interface System<S> {
  /** Stable name: derives the PRNG stream. */
  name: string;
  update(state: S, ctx: SystemContext): void;
}

/** Default cap: 2 s of backlog at x100; beyond it the simulation slows down (D-02). */
export const DEFAULT_MAX_STEPS_PER_ADVANCE = 200;

/** What a simulation needs, besides its state, to continue exactly where it stopped (D-04). */
export interface SimulationSnapshot {
  step: number;
  /** State of every system stream, by system name. */
  prng: Record<string, PrngState>;
}

export interface SimulationOptions<S> {
  seed: bigint | number;
  state: S;
  /** Explicit resolution order, run in this order at every step. */
  systems: readonly System<S>[];
  /** Max steps run by one advance() call; the excess backlog is dropped, never caught up. */
  maxStepsPerAdvance?: number;
  /** Continues a saved run: step counter and stream states instead of a fresh start. */
  resume?: SimulationSnapshot;
}

export interface Simulation<S> {
  readonly state: S;
  readonly time: SimTime;
  speed: Speed;
  readonly systemOrder: readonly string[];
  /** Step counter and stream states, to save and pass back as `resume`. */
  snapshot(): SimulationSnapshot;
  /** Runs exactly one step, whatever the speed. */
  stepOnce(): void;
  /** Feeds real elapsed ms; runs the whole steps due at the current speed, capped by maxStepsPerAdvance. */
  advance(realMs: number): number;
}

export const createSimulation = <S>({
  seed,
  state,
  systems,
  maxStepsPerAdvance = DEFAULT_MAX_STEPS_PER_ADVANCE,
  resume,
}: SimulationOptions<S>): Simulation<S> => {
  if (!Number.isInteger(maxStepsPerAdvance) || maxStepsPerAdvance < 1) {
    throw new Error("maxStepsPerAdvance must be a positive integer");
  }
  const names = systems.map((s) => s.name);
  if (new Set(names).size !== names.length) throw new Error("Duplicate system name");
  const streams = new Map(
    names.map((name) => {
      const saved = resume?.prng[name];
      return [name, saved ? createPrngFromState(saved) : createStream(seed, name)];
    }),
  );
  let step = resume?.step ?? 0;
  let owed = 0;

  const sim: Simulation<S> = {
    state,
    speed: "x1",
    systemOrder: names,
    get time() {
      return timeOfStep(step);
    },
    snapshot() {
      const prng: Record<string, PrngState> = {};
      for (const name of names) prng[name] = streams.get(name)!.getState();
      return { step, prng };
    },
    stepOnce() {
      for (const system of systems) {
        const prng = streams.get(system.name) as Prng;
        system.update(state, {
          step,
          prng,
          shuffle: (items) => shuffle([...items], prng),
        });
      }
      step++;
    },
    advance(realMs) {
      owed += (realMs / 1000) * SPEEDS[sim.speed];
      const due = Math.min(Math.floor(owed), maxStepsPerAdvance);
      // Drop the backlog beyond the cap: the simulation slows down, no step is skipped.
      owed = due === maxStepsPerAdvance ? 0 : owed - due;
      for (let i = 0; i < due; i++) sim.stepOnce();
      return due;
    },
  };
  return sim;
};
