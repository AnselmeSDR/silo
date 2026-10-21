import { createRng, type Rng } from "./rng";

export type StepFn<S> = (state: S, rng: Rng, tick: number) => S;

export interface ReplayOptions<S> {
  seed: number;
  ticks: number;
  initial: S;
  step: StepFn<S>;
}

/** Replays a simulation with a fixed seed; returns states for ticks 0..ticks. */
export const replay = <S>({ seed, ticks, initial, step }: ReplayOptions<S>): S[] => {
  const rng = createRng(seed);
  const states: S[] = [initial];
  let state = initial;
  for (let tick = 1; tick <= ticks; tick++) {
    state = step(state, rng, tick);
    states.push(state);
  }
  return states;
};
