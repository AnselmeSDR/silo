import { SCENARIO_VERSION, type ScenarioConfig, type SectorAssignment } from "./config";
import type { SectorType } from "./sectors";

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const on = (sector: SectorType, levels: number[], roomCapacity = 2): SectorAssignment => ({
  sector,
  levels,
  roomCapacity,
});

/** Simple starting silo: D-08 target topology, D-06 population, one sector family per level band. */
export const starterSilo: ScenarioConfig = {
  version: SCENARIO_VERSION,
  name: "starter",
  seed: 1,
  population: {
    total: 2000,
    ageClasses: [
      { minAge: 0, maxAge: 14, sharePercent: 20 },
      { minAge: 15, maxAge: 39, sharePercent: 40 },
      { minAge: 40, maxAge: 64, sharePercent: 30 },
      { minAge: 65, maxAge: 90, sharePercent: 10 },
    ],
  },
  topology: { levels: 24, arteriesPerLevel: 4 },
  sectors: [
    on("externalAccess", [0]),
    on("security", [1]),
    on("administration", [2]),
    on("communications", [3]),
    on("educationArchives", [4]),
    on("cultureSociability", [5]),
    on("health", [6]),
    on("housing", range(7, 18), 5),
    on("catering", [19]),
    on("logistics", [20]),
    on("agriculture", [21]),
    on("waterSanitation", [22]),
    // Level 23 is shared by the technical sectors, one artery each.
    { sector: "energy", levels: [23], arteries: [0], roomCapacity: 2 },
    { sector: "airVentilation", levels: [23], arteries: [1], roomCapacity: 2 },
    { sector: "maintenanceIndustry", levels: [23], arteries: [2], roomCapacity: 2 },
    { sector: "recyclingWaste", levels: [23], arteries: [3], roomCapacity: 2 },
  ],
  stocks: {
    waterMl: 2_000_000_000,
    foodKcal: 60_000_000,
    energyWs: 36_000_000_000,
    spareParts: 500,
  },
};
