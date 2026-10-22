import { validateScenario } from "../scenario";
import { RESOURCE_KINDS, verifyStocks, type Stocks } from "../stocks";
import { FORMAT_VERSION } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInt = (value: unknown, min = 0): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min;

const isU32 = (value: unknown): boolean => isInt(value) && (value as number) <= 0xffffffff;

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

  const needs = isRecord(data.needs) ? data.needs.byInhabitant : undefined;
  if (!Array.isArray(needs)) errors.push("needs.byInhabitant must be an array");
  else if (Array.isArray(entities) && needs.length !== entities.length) {
    errors.push("needs.byInhabitant must hold one entry per inhabitant");
  } else {
    needs.forEach((n: unknown, i) => {
      if (!isRecord(n) || !isRecord(n.gauges) || !isRecord(n.traits)) {
        errors.push(`needs.byInhabitant[${i}] needs gauges and traits`);
      }
    });
  }

  const work = data.work;
  if (!isRecord(work) || !isRecord(work.profiles) || !Array.isArray(work.assignments)) {
    errors.push("work needs profiles and assignments");
  } else {
    const count = Array.isArray(entities) ? entities.length : 0;
    for (const id of Object.keys(work.profiles)) {
      if (!isInt(Number(id)) || Number(id) >= count) {
        errors.push(`work.profiles.${id} refers to an unknown inhabitant`);
      }
    }
    work.assignments.forEach((a: unknown, i) => {
      const at = `work.assignments[${i}]`;
      if (!isRecord(a) || !isInt(a.inhabitantId) || a.inhabitantId >= count) {
        errors.push(`${at}.inhabitantId must be an existing inhabitant`);
      } else if (!isInt(a.room) || a.room >= nodeCount) {
        errors.push(`${at}.room must be an existing node`);
      }
    });
  }

  const stocks = data.stocks;
  if (
    !isRecord(stocks) ||
    !Array.isArray(stocks.stocks) ||
    !isRecord(stocks.reservations) ||
    !isInt(stocks.nextReservationId) ||
    !isRecord(stocks.totals) ||
    !RESOURCE_KINDS.every((kind) => isRecord((stocks.totals as Record<string, unknown>)[kind]))
  ) {
    errors.push("stocks needs stocks, reservations, nextReservationId and totals per resource");
  } else {
    stocks.stocks.forEach((st: unknown, i) => {
      const at = `stocks.stocks[${i}]`;
      if (!isRecord(st) || st.id !== i) errors.push(`${at}.id must equal its index`);
      else if (!isInt(st.node) || st.node >= nodeCount) {
        errors.push(`${at}.node must be an existing node`);
      }
    });
    // The balance must hold: a save that does not add up is damaged, not just old.
    if (errors.length === 0) errors.push(...verifyStocks(stocks as unknown as Stocks));
  }
  return errors;
};
