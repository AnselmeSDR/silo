export const STEPS_PER_DAY = 1440;
export const DAYS_PER_YEAR = 360;

/** Playback speeds (D-06): steps per real second; pause runs none. */
export const SPEEDS = { pause: 0, x1: 1, x10: 10, x100: 100 } as const;
export type Speed = keyof typeof SPEEDS;

export interface SimTime {
  step: number;
  day: number;
  year: number;
  minuteOfDay: number;
}

/** Simulated time is derived from the integer step only. */
export const timeOfStep = (step: number): SimTime => {
  const day = Math.floor(step / STEPS_PER_DAY);
  return {
    step,
    day,
    year: Math.floor(day / DAYS_PER_YEAR),
    minuteOfDay: step % STEPS_PER_DAY,
  };
};
