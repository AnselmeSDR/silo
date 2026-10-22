import { validateScenario } from "../scenario";
import { FORMAT_VERSION } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInt = (value: unknown, min = 0): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min;

const isU32 = (value: unknown): boolean => isInt(value) && (value as number) <= 0xffffffff;

const STOCK_KEYS = ["waterMl", "foodKcal", "energyWs", "spareParts"];
const HEALTH = ["healthy", "ill", "injured", "dead"];

/** Returns every structural problem of a migrated save; an empty list means it can be restored. */
export const validateSave = (data: unknown): string[] => {
  if (!isRecord(data)) return ["save must be a JSON object"];
  const errors: string[] = [];
  if (data.formatVersion !== FORMAT_VERSION) errors.push(`formatVersion must be ${FORMAT_VERSION}`);
  if (typeof data.engineVersion !== "string") errors.push("engineVersion must be a string");

  errors.push(...validateScenario(data.scenario).map((e) => `scenario: ${e}`));

  if (!isRecord(data.clock) || !isInt(data.clock.step)) {
    errors.push("clock.step must be an integer >= 0");
  }

  if (!isRecord(data.prng) || Object.keys(data.prng).length === 0) {
    errors.push("prng must hold the state of each system stream");
  } else {
    for (const [name, state] of Object.entries(data.prng)) {
      if (!Array.isArray(state) || state.length !== 4 || !state.every(isU32)) {
        errors.push(`prng.${name} must be 4 unsigned 32-bit integers`);
      } else if (state.every((n) => n === 0)) {
        errors.push(`prng.${name} is the all-zero state, which never changes`);
      }
    }
  }

  let nodeCount = 0;
  const spatial = isRecord(data.world) ? data.world.spatial : undefined;
  if (!isRecord(spatial) || !Array.isArray(spatial.nodes) || !Array.isArray(spatial.edges)) {
    errors.push("world.spatial needs nodes and edges arrays");
  } else {
    nodeCount = spatial.nodes.length;
    if (!isInt(spatial.revision)) errors.push("world.spatial.revision must be an integer >= 0");
    spatial.nodes.forEach((n: unknown, i) => {
      if (!isRecord(n) || n.id !== i) {
        errors.push(`world.spatial.nodes[${i}].id must equal its index`);
      }
    });
    spatial.edges.forEach((e: unknown, i) => {
      if (
        !isRecord(e) ||
        !isInt(e.from) ||
        !isInt(e.to) ||
        e.from >= nodeCount ||
        e.to >= nodeCount
      ) {
        errors.push(`world.spatial.edges[${i}] must join two existing nodes`);
      }
    });
  }

  const entities = isRecord(data.entities) ? data.entities.inhabitants : undefined;
  if (!Array.isArray(entities)) errors.push("entities.inhabitants must be an array");
  else {
    entities.forEach((h: unknown, i) => {
      const at = `entities.inhabitants[${i}]`;
      if (!isRecord(h) || h.id !== i) {
        errors.push(`${at}.id must equal its index`);
        return;
      }
      if (!HEALTH.includes(h.health as string)) errors.push(`${at}.health is unknown`);
      for (const key of ["residence", "position"]) {
        const node = h[key];
        if (!isInt(node) || node >= nodeCount) {
          errors.push(`${at}.${key} must be an existing node`);
        }
      }
    });
  }

  const movement = data.movement;
  if (!isRecord(movement) || !isRecord(movement.trips) || !isRecord(movement.capacityPerStep)) {
    errors.push("movement needs trips and capacityPerStep");
  } else {
    if (!isRecord(movement.stats)) errors.push("movement.stats must be an object");
    if (Array.isArray(entities)) {
      for (const id of Object.keys(movement.trips)) {
        if (!isInt(Number(id)) || Number(id) >= entities.length) {
          errors.push(`movement.trips.${id} refers to an unknown inhabitant`);
        }
      }
    }
  }

  if (!isRecord(data.stocks)) errors.push("stocks must be an object");
  else {
    for (const key of STOCK_KEYS) {
      if (!isInt(data.stocks[key])) errors.push(`stocks.${key} must be an integer >= 0`);
    }
  }
  return errors;
};
