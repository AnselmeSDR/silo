import { buildSpatialModel, type SpatialModel } from "../spatial";
import type { ScenarioConfig, SectorAssignment } from "./config";
import { getSector } from "./sectors";

/** Builds the spatial model of a validated scenario: room function and capacity come from its sectors. */
export const buildScenarioModel = (config: ScenarioConfig): SpatialModel => {
  const { levels, arteriesPerLevel } = config.topology;
  const assignmentAt = new Map<string, SectorAssignment>();
  for (const assignment of config.sectors) {
    for (const level of assignment.levels) {
      for (const artery of assignment.arteries ??
        Array.from({ length: arteriesPerLevel }, (_, k) => k)) {
        assignmentAt.set(`${level}/${artery}`, assignment);
      }
    }
  }
  // Validation guarantees every (level, artery) is assigned exactly once.
  const at = (level: number, artery: number): SectorAssignment =>
    assignmentAt.get(`${level}/${artery}`)!;

  return buildSpatialModel({
    levels,
    arteriesPerLevel,
    roomCapacity: (level, artery) => at(level, artery).roomCapacity,
    roomFunction: (level, artery) => getSector(at(level, artery).sector).roomFunction,
  });
};
