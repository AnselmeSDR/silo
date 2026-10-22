import { STEPS_PER_DAY } from "../core";
import type { DayPhase, DayPlan, PhaseSpan, Shift } from "./types";

export const CLOCK_IN_MIN = 5;
export const PREP_MIN = 10;
export const HANDOVER_MIN = 10;
export const BREAK_MIN = 30;
/** Shifts shorter than this get no break. */
const BREAK_FROM_DURATION_MIN = 240;

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** Whole minutes (one step each) of a travel time in ms, at least one. */
export const commuteMinutes = (ms: number): number => Math.max(1, Math.ceil(ms / 60000));

/**
 * One working day: commute, clock-in, preparation, work (split by a break when long enough),
 * handover to the next team, return. `durationMin` runs from clock-in to the end of the handover.
 */
export const planDay = (shift: Shift, commuteMin: number): DayPlan => {
  const fixed = CLOCK_IN_MIN + PREP_MIN + HANDOVER_MIN;
  if (!Number.isInteger(shift.durationMin) || shift.durationMin <= fixed) {
    throw new Error(`shift must last more than ${fixed} min`);
  }
  if (shift.durationMin + 2 * commuteMin > STEPS_PER_DAY) throw new Error("shift too long");
  const hasBreak = shift.durationMin >= BREAK_FROM_DURATION_MIN;
  const workMin = shift.durationMin - fixed - (hasBreak ? BREAK_MIN : 0);

  const spans: PhaseSpan[] = [];
  let at = 0;
  const add = (phase: PhaseSpan["phase"], length: number): void => {
    if (length <= 0) return;
    spans.push({ phase, from: at, to: at + length });
    at += length;
  };
  add("commute", commuteMin);
  add("clockIn", CLOCK_IN_MIN);
  add("prep", PREP_MIN);
  if (hasBreak) {
    add("work", Math.ceil(workMin / 2));
    add("break", BREAK_MIN);
    add("work", Math.floor(workMin / 2));
  } else {
    add("work", workMin);
  }
  add("handover", HANDOVER_MIN);
  add("return", commuteMin);
  return { departureMinute: mod(shift.startMinute - commuteMin, STEPS_PER_DAY), spans };
};

export const phaseAt = (plan: DayPlan, minuteOfDay: number): DayPhase => {
  const offset = mod(minuteOfDay - plan.departureMinute, STEPS_PER_DAY);
  return plan.spans.find((s) => offset >= s.from && offset < s.to)?.phase ?? "off";
};

/** At the post and on shift (break included): what a continuous service needs covered. */
export const isOnDuty = (phase: DayPhase): boolean =>
  phase === "clockIn" ||
  phase === "prep" ||
  phase === "work" ||
  phase === "break" ||
  phase === "handover";

/**
 * Shifts of `teamCount` relaying teams covering 24 h. Each shift overlaps the next by the
 * clock-in, preparation and handover time so that the work phases join without a gap.
 */
export const relayShifts = (teamCount: number, firstStartMinute = 0): Shift[] => {
  if (!Number.isInteger(teamCount) || teamCount < 2 || STEPS_PER_DAY % teamCount !== 0) {
    throw new Error("teamCount must be a divisor of the day length, at least 2");
  }
  const period = STEPS_PER_DAY / teamCount;
  const overlap = CLOCK_IN_MIN + PREP_MIN + HANDOVER_MIN;
  return Array.from({ length: teamCount }, (_, team) => ({
    startMinute: mod(firstStartMinute + team * period, STEPS_PER_DAY),
    durationMin: period + overlap,
  }));
};
