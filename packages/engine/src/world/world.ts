import { createSimulation, type Simulation } from "../core";
import { createMovement, movementSystem, type MovementWorld } from "../movement";
import { createPopulation, moveInhabitant, type Population } from "../population";
import {
  addMachine,
  createProduction,
  getSheet,
  productionSystem,
  type ProductionWorld,
} from "../production";
import { buildScenarioModel, type ScenarioConfig, type SectorType } from "../scenario";
import { rooms, type SpatialModel } from "../spatial";
import { addStock, createStocks, stocksSystem, type ResourceKind, type Stocks } from "../stocks";
import {
  availableWorkforce,
  createAssignment,
  createWorkProfile,
  getProfession,
  relayShifts,
  sectorOfRoom,
  type Assignment,
  type WorkProfile,
} from "../work";

/** The whole mutable state of a run. */
export interface World extends MovementWorld, ProductionWorld {}

/** Where each resource is stored at the start (D-06: stocks are local, not global). */
const STORAGE_SECTOR: Record<ResourceKind, SectorType> = {
  water: "waterSanitation",
  food: "catering",
  energy: "energy",
  spareParts: "maintenanceIndustry",
};

/** Skill level given to the starting operators, 0-100. */
const STARTING_SKILL = 70;

/** Teams relaying on a production line, each with the operators the sheet requires. */
const TEAMS_PER_LINE = 3;

const firstRoomOf = (config: ScenarioConfig, spatial: SpatialModel, sector: SectorType): number => {
  const room = rooms(spatial).find(
    (r) => r.service !== "inaccessible" && sectorOfRoom(config, r) === sector,
  );
  if (!room) throw new Error(`scenario has no usable room in the ${sector} sector`);
  return room.id;
};

const createStartingStocks = (config: ScenarioConfig, spatial: SpatialModel) => {
  const stocks = createStocks();
  const initial: Record<ResourceKind, number> = {
    water: config.stocks.waterMl,
    food: config.stocks.foodKcal,
    energy: config.stocks.energyWs,
    spareParts: config.stocks.spareParts,
  };
  const ids = {} as Record<ResourceKind, number>;
  for (const kind of Object.keys(initial) as ResourceKind[]) {
    ids[kind] = addStock(stocks, {
      node: firstRoomOf(config, spatial, STORAGE_SECTOR[kind]),
      kind,
      capacity: Math.max(1, initial[kind] * 2),
      initial: initial[kind],
    });
  }
  return { stocks, ids };
};

/**
 * Installs the production lines of the scenario and staffs them with relaying teams of available
 * adults, posted in the line's room (the trip to work is not simulated yet).
 */
const createStartingProduction = (
  config: ScenarioConfig,
  spatial: SpatialModel,
  population: Population,
  stocks: Stocks,
  stockIds: Record<ResourceKind, number>,
) => {
  const production = createProduction();
  const assignments: Assignment[] = [];
  const profiles = new Map<number, WorkProfile>();
  const pool = availableWorkforce(population, profiles, 0, 0).available;
  let next = 0;
  for (const line of config.production ?? []) {
    const sheet = getSheet(line.sheetId);
    const room = firstRoomOf(config, spatial, line.sector);
    addMachine(stocks, production, {
      sheetId: sheet.id,
      room,
      inputStocks: Object.fromEntries(sheet.inputs.map(({ kind }) => [kind, stockIds[kind]])),
      outputStock: stockIds[sheet.output.kind],
    });
    const skills = Object.fromEntries(
      getProfession(sheet.profession).skills.map((skill) => [skill, STARTING_SKILL]),
    );
    for (const shift of relayShifts(TEAMS_PER_LINE)) {
      for (let seat = 0; seat < sheet.operators; seat++) {
        const id = pool[next++];
        if (id === undefined) throw new Error("not enough workforce to staff the production");
        profiles.set(id, createWorkProfile({ skills }));
        assignments.push(
          createAssignment(spatial, config, population, id, sheet.profession, room, shift),
        );
        moveInhabitant(population, id, room);
      }
    }
  }
  return { production, assignments, profiles };
};

export const createWorld = (config: ScenarioConfig): World => {
  const spatial = buildScenarioModel(config);
  const population = createPopulation(spatial, {
    count: config.population.total,
    seed: config.seed,
  });
  const { stocks, ids } = createStartingStocks(config, spatial);
  return {
    spatial,
    population,
    movement: createMovement(),
    stocks,
    ...createStartingProduction(config, spatial, population, stocks, ids),
  };
};

/** Simulation of a validated scenario, ready to step with no rendering. */
export const createScenarioSimulation = (config: ScenarioConfig): Simulation<World> =>
  createSimulation<World>({
    seed: config.seed,
    state: createWorld(config),
    // Stocks last: it applies the losses, checks the balance and opens the next step.
    systems: [productionSystem, movementSystem, stocksSystem],
  });
