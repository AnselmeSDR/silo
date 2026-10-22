import { DAYS_PER_YEAR, STEPS_PER_DAY, createStream, shuffle, type Prng } from "../core";
import type { NodeId, SpatialModel } from "../spatial";
import type { AgeClass, HealthStatus, Inhabitant, Population, PopulationOptions } from "./types";

/** Population ceiling of D-03 and D-06. */
export const MAX_POPULATION = 2000;

/** D-06: 0-14 20 %, 15-39 40 %, 40-64 30 %, 65-90 10 %. */
export const DEFAULT_AGE_CLASSES: readonly AgeClass[] = [
  { minAge: 0, maxAge: 14, weight: 20 },
  { minAge: 15, maxAge: 39, weight: 40 },
  { minAge: 40, maxAge: 64, weight: 30 },
  { minAge: 65, maxAge: 90, weight: 10 },
];

const drawAge = (classes: readonly AgeClass[], prng: Prng): number => {
  const total = classes.reduce((sum, c) => sum + c.weight, 0);
  let roll = prng.int(total);
  for (const c of classes) {
    if (roll < c.weight) return c.minAge + prng.int(c.maxAge - c.minAge + 1);
    roll -= c.weight;
  }
  return 0;
};

/** Age in whole years at `day`; frozen at the day of death. Birthday is derived from the id (D-06). */
export const ageOf = (inhabitant: Inhabitant, day: number): number => {
  const end =
    inhabitant.diedAtStep === null
      ? day
      : Math.min(day, Math.floor(inhabitant.diedAtStep / STEPS_PER_DAY));
  return Math.floor((end - inhabitant.birthDay) / DAYS_PER_YEAR);
};

export const isAlive = (inhabitant: Inhabitant): boolean => inhabitant.health !== "dead";

export const createPopulation = (
  spatial: SpatialModel,
  { count, seed, ageClasses = DEFAULT_AGE_CLASSES }: PopulationOptions,
): Population => {
  if (!Number.isInteger(count) || count < 1 || count > MAX_POPULATION) {
    throw new Error(`count must be an integer in [1, ${MAX_POPULATION}]`);
  }
  if (ageClasses.length === 0 || ageClasses.some((c) => c.weight < 0 || c.minAge > c.maxAge)) {
    throw new Error("invalid age classes");
  }
  if (ageClasses.reduce((sum, c) => sum + c.weight, 0) <= 0) {
    throw new Error("age classes need a positive total weight");
  }

  const beds: NodeId[] = [];
  for (const node of spatial.nodes) {
    if (node.kind !== "room" || node.function !== "housing") continue;
    if (node.service === "inaccessible") continue;
    for (let i = 0; i < node.capacity; i++) beds.push(node.id);
  }
  if (beds.length < count) {
    throw new Error(`not enough housing: ${beds.length} beds for ${count} inhabitants`);
  }

  const prng = createStream(seed, "population-init");
  // Shuffled beds: no housing priority by id (D-02).
  const assigned = shuffle(beds, prng);
  const inhabitants: Inhabitant[] = [];
  for (let id = 0; id < count; id++) {
    const age = drawAge(ageClasses, prng);
    const residence = assigned[id] as NodeId;
    inhabitants.push({
      id,
      // Anniversary falls on day (id % 360) of the year; age at day 0 is the drawn age.
      birthDay: -age * DAYS_PER_YEAR - (id % DAYS_PER_YEAR),
      health: "healthy",
      diedAtStep: null,
      residence,
      position: residence,
    });
  }
  return { inhabitants };
};

export const getInhabitant = (population: Population, id: number): Inhabitant => {
  const inhabitant = population.inhabitants[id];
  if (!inhabitant) throw new Error(`unknown inhabitant ${id}`);
  return inhabitant;
};

export const moveInhabitant = (population: Population, id: number, position: NodeId): void => {
  const inhabitant = getInhabitant(population, id);
  if (!isAlive(inhabitant)) throw new Error(`inhabitant ${id} is dead`);
  inhabitant.position = position;
};

export const setHealth = (
  population: Population,
  id: number,
  health: Exclude<HealthStatus, "dead">,
): void => {
  const inhabitant = getInhabitant(population, id);
  if (!isAlive(inhabitant)) throw new Error(`inhabitant ${id} is dead`);
  inhabitant.health = health;
};

/** Marks the death: the entity stays (identity, residence, last position, age at death). */
export const killInhabitant = (population: Population, id: number, step: number): void => {
  const inhabitant = getInhabitant(population, id);
  if (!isAlive(inhabitant)) return;
  inhabitant.health = "dead";
  inhabitant.diedAtStep = step;
};
