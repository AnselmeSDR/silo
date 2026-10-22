import { findPath, getRoom, type SpatialModel } from "../spatial";
import { ageOf, getInhabitant, type Population } from "../population";
import { commuteMinutes, isOnDuty, phaseAt, planDay } from "./day";
import { getProfession } from "./catalog";
import type { Assignment, Shift, WorkProfile } from "./types";

/** Working age range (inclusive, years); outside it, children and retirees are not workforce. */
export const WORKING_AGE_MIN = 16;
export const WORKING_AGE_MAX = 64;

export const createWorkProfile = (overrides: Partial<WorkProfile> = {}): WorkProfile => ({
  skills: {},
  willingness: 100,
  inTraining: false,
  absentUntilStep: null,
  ...overrides,
});

/** Assigns an inhabitant to a room with a profession and a shift; throws on an invalid pairing. */
export const createAssignment = (
  spatial: SpatialModel,
  population: Population,
  inhabitantId: number,
  professionId: string,
  room: number,
  shift: Shift,
): Assignment => {
  const profession = getProfession(professionId);
  const target = getRoom(spatial, room);
  if (!profession.places.includes(target.function)) {
    throw new Error(`${professionId} cannot work in a ${target.function} room`);
  }
  if (target.service === "inaccessible") throw new Error(`room ${room} is inaccessible`);
  const inhabitant = getInhabitant(population, inhabitantId);
  if (inhabitant.health === "dead") throw new Error(`inhabitant ${inhabitantId} is dead`);
  return { inhabitantId, professionId, room, shift };
};

/** Commute in minutes from home to the post, null when the post cannot be reached. */
export const commuteOf = (
  spatial: SpatialModel,
  population: Population,
  assignment: Assignment,
): number | null => {
  const home = getInhabitant(population, assignment.inhabitantId).residence;
  const path = findPath(spatial, home, assignment.room);
  return path ? commuteMinutes(path.ms) : null;
};

export const isAbsent = (profile: WorkProfile, step: number): boolean =>
  profile.absentUntilStep !== null && step < profile.absentUntilStep;

export interface Workforce {
  population: number;
  available: number[];
  excluded: { dead: number; sick: number; age: number; training: number; absent: number };
}

/** Available workforce: smaller than the population (children, retirees, sick, training, absent). */
export const availableWorkforce = (
  population: Population,
  profiles: ReadonlyMap<number, WorkProfile>,
  day: number,
  step: number,
): Workforce => {
  const result: Workforce = {
    population: population.inhabitants.length,
    available: [],
    excluded: { dead: 0, sick: 0, age: 0, training: 0, absent: 0 },
  };
  for (const inhabitant of population.inhabitants) {
    const profile = profiles.get(inhabitant.id) ?? createWorkProfile();
    const age = ageOf(inhabitant, day);
    if (inhabitant.health === "dead") result.excluded.dead++;
    else if (inhabitant.health !== "healthy") result.excluded.sick++;
    else if (age < WORKING_AGE_MIN || age > WORKING_AGE_MAX) result.excluded.age++;
    else if (profile.inTraining) result.excluded.training++;
    else if (isAbsent(profile, step)) result.excluded.absent++;
    else result.available.push(inhabitant.id);
  }
  return result;
};

/**
 * Productive presence at `step`: alive and healthy, not absent, in the working phase of the day
 * and physically in the assigned room. A commute still under way, a blocked trip, an absence
 * or a strike never count as productive presence (concept §5.2.2).
 */
export const isProductive = (
  spatial: SpatialModel,
  population: Population,
  profile: WorkProfile,
  assignment: Assignment,
  step: number,
  minuteOfDay: number,
): boolean => {
  const inhabitant = getInhabitant(population, assignment.inhabitantId);
  if (inhabitant.health !== "healthy" || isAbsent(profile, step)) return false;
  if (inhabitant.position !== assignment.room) return false;
  const commute = commuteOf(spatial, population, assignment) ?? 0;
  return phaseAt(planDay(assignment.shift, commute), minuteOfDay) === "work";
};

/** Real output factor 0-1: mean of the required skills times willingness. Assigned ≠ able ≠ willing. */
export const effectiveness = (profile: WorkProfile, professionId: string): number => {
  const { skills } = getProfession(professionId);
  const mean = skills.reduce((sum, s) => sum + (profile.skills[s] ?? 0), 0) / skills.length;
  return (mean / 100) * (profile.willingness / 100);
};

/**
 * Number of assigned workers on duty (break included) at a post for a profession at `minuteOfDay`;
 * lets a continuous service check that its relaying teams leave no hour uncovered.
 */
export const onDutyCount = (
  spatial: SpatialModel,
  population: Population,
  assignments: readonly Assignment[],
  professionId: string,
  room: number,
  minuteOfDay: number,
): number => {
  let count = 0;
  for (const a of assignments) {
    if (a.professionId !== professionId || a.room !== room) continue;
    const commute = commuteOf(spatial, population, a);
    if (commute === null) continue;
    if (isOnDuty(phaseAt(planDay(a.shift, commute), minuteOfDay))) count++;
  }
  return count;
};
