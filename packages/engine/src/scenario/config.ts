import { SECTOR_TYPES, type SectorType } from "./sectors";

export const SCENARIO_VERSION = 1;

/** Age class of the initial population; shares are in percent (D-06). */
export interface AgeClass {
  minAge: number;
  maxAge: number;
  sharePercent: number;
}

/** Sectors on a set of levels; omitted `arteries` means every artery of those levels. */
export interface SectorAssignment {
  sector: SectorType;
  levels: number[];
  arteries?: number[];
  /** Occupants a room of this sector can host. */
  roomCapacity: number;
}

/** Initial stocks, integers in the smallest sub-unit of D-06. */
export interface InitialStocks {
  waterMl: number;
  foodKcal: number;
  energyWs: number;
  spareParts: number;
}

export interface ScenarioConfig {
  version: typeof SCENARIO_VERSION;
  name: string;
  seed: number;
  population: { total: number; ageClasses: AgeClass[] };
  topology: { levels: number; arteriesPerLevel: number };
  sectors: SectorAssignment[];
  stocks: InitialStocks;
}

export class ScenarioError extends Error {
  constructor(readonly errors: string[]) {
    super(`Invalid scenario:\n- ${errors.join("\n- ")}`);
    this.name = "ScenarioError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInt = (value: unknown, min: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min;

const isIndexList = (value: unknown, count: number): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((v) => isInt(v, 0) && v < count);

// Rooms per artery in the spatial model (5 modules, one room on each side).
const ROOMS_PER_ARTERY = 10;

const validateAgeClasses = (classes: unknown, errors: string[]): void => {
  if (!Array.isArray(classes) || classes.length === 0) {
    errors.push("population.ageClasses must be a non-empty array");
    return;
  }
  let share = 0;
  classes.forEach((c: unknown, i) => {
    if (
      !isRecord(c) ||
      !isInt(c.minAge, 0) ||
      !isInt(c.maxAge, 0) ||
      c.maxAge < c.minAge ||
      typeof c.sharePercent !== "number" ||
      c.sharePercent < 0
    ) {
      errors.push(`population.ageClasses[${i}] needs minAge <= maxAge and sharePercent >= 0`);
      return;
    }
    share += c.sharePercent;
  });
  if (Math.abs(share - 100) > 1e-9) errors.push("population.ageClasses shares must sum to 100");
};

/** Returns the housing capacity of the assignments, and pushes every problem found. */
const validateSectors = (
  sectors: unknown,
  levels: number,
  arteries: number,
  errors: string[],
): number => {
  if (!Array.isArray(sectors) || sectors.length === 0) {
    errors.push("sectors must be a non-empty array");
    return 0;
  }
  const errorsBefore = errors.length;
  const taken = new Set<string>();
  let housingCapacity = 0;
  sectors.forEach((a: unknown, i) => {
    const at = `sectors[${i}]`;
    if (!isRecord(a)) {
      errors.push(`${at} must be an object`);
      return;
    }
    if (!SECTOR_TYPES.includes(a.sector as SectorType)) {
      errors.push(`${at}.sector "${String(a.sector)}" is unknown`);
    }
    const capacityOk = isInt(a.roomCapacity, 1);
    if (!capacityOk) errors.push(`${at}.roomCapacity must be an integer >= 1`);
    if (!isIndexList(a.levels, levels)) {
      errors.push(`${at}.levels must be non-empty and within 0..${levels - 1}`);
      return;
    }
    const artList = a.arteries ?? Array.from({ length: arteries }, (_, k) => k);
    if (!isIndexList(artList, arteries)) {
      errors.push(`${at}.arteries must be non-empty and within 0..${arteries - 1}`);
      return;
    }
    for (const l of a.levels) {
      for (const k of artList) {
        const key = `${l}/${k}`;
        if (taken.has(key)) errors.push(`${at}: level ${l} artery ${k} is already assigned`);
        taken.add(key);
        if (a.sector === "housing" && capacityOk)
          housingCapacity += (a.roomCapacity as number) * ROOMS_PER_ARTERY;
      }
    }
  });
  if (errors.length === errorsBefore) {
    for (let l = 0; l < levels; l++) {
      for (let k = 0; k < arteries; k++) {
        if (!taken.has(`${l}/${k}`)) errors.push(`level ${l} artery ${k} has no sector`);
      }
    }
  }
  return housingCapacity;
};

/** Returns every problem found; an empty list means the value is a valid scenario. */
export const validateScenario = (value: unknown): string[] => {
  if (!isRecord(value)) return ["scenario must be an object"];
  const errors: string[] = [];

  if (value.version !== SCENARIO_VERSION) errors.push(`version must be ${SCENARIO_VERSION}`);
  if (typeof value.name !== "string" || value.name === "") {
    errors.push("name must be a non-empty string");
  }
  if (!isInt(value.seed, 0)) errors.push("seed must be an integer >= 0");

  const { population, topology, sectors, stocks } = value;

  let total = 0;
  if (!isRecord(population)) errors.push("population must be an object");
  else {
    if (isInt(population.total, 1)) total = population.total;
    else errors.push("population.total must be an integer >= 1");
    validateAgeClasses(population.ageClasses, errors);
  }

  let levels = 0;
  let arteries = 0;
  if (!isRecord(topology)) errors.push("topology must be an object");
  else {
    if (isInt(topology.levels, 1)) levels = topology.levels;
    else errors.push("topology.levels must be an integer >= 1");
    if (isInt(topology.arteriesPerLevel, 1)) arteries = topology.arteriesPerLevel;
    else errors.push("topology.arteriesPerLevel must be an integer >= 1");
  }

  const housingCapacity = validateSectors(sectors, levels, arteries, errors);
  if (total > 0 && Array.isArray(sectors) && housingCapacity < total) {
    errors.push(`housing capacity ${housingCapacity} is below the population ${total}`);
  }

  if (!isRecord(stocks)) errors.push("stocks must be an object");
  else {
    for (const key of ["waterMl", "foodKcal", "energyWs", "spareParts"]) {
      if (!isInt(stocks[key], 0)) errors.push(`stocks.${key} must be an integer >= 0`);
    }
  }

  return errors;
};

/** Parses and validates a scenario file; throws `ScenarioError` listing every problem. */
export const loadScenario = (json: string): ScenarioConfig => {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new ScenarioError(["not valid JSON"]);
  }
  const errors = validateScenario(value);
  if (errors.length > 0) throw new ScenarioError(errors);
  return value as ScenarioConfig;
};
