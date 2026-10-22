import { STEPS_PER_DAY, type System } from "../core";
import {
  consumeReservation,
  deposit,
  freeOf,
  releaseReservation,
  reserve,
  roomOf,
  type Stocks,
} from "../stocks";
import { commuteOf, effectiveness, isProductive, type Assignment } from "../work";
import { getSheet } from "./sheets";
import type {
  BlockReason,
  Machine,
  ProductionSheet,
  ProductionState,
  ProductionWorld,
} from "./types";

export const createProduction = (): ProductionState => ({ machines: [], commutes: new Map() });

export interface MachineOptions {
  sheetId: string;
  room: number;
  inputStocks: Machine["inputStocks"];
  outputStock: number;
  working?: boolean;
}

/** Installs a machine and returns its id; every input kind of the sheet needs a stock. */
export const addMachine = (
  stocks: Stocks,
  production: ProductionState,
  { sheetId, room, inputStocks, outputStock, working = true }: MachineOptions,
): number => {
  const sheet = getSheet(sheetId);
  for (const { kind } of sheet.inputs) {
    const id = inputStocks[kind];
    if (id === undefined || stocks.stocks[id]?.kind !== kind) {
      throw new Error(`${sheetId} needs a ${kind} stock as input`);
    }
  }
  if (stocks.stocks[outputStock]?.kind !== sheet.output.kind) {
    throw new Error(`${sheetId} needs a ${sheet.output.kind} stock as output`);
  }
  const id = production.machines.length;
  production.machines.push({
    id,
    sheetId,
    room,
    inputStocks,
    outputStock,
    working,
    batches: [],
    status: "operator",
    totals: {
      started: 0,
      completed: 0,
      consumed: {},
      produced: 0,
      wasted: 0,
      blockedSteps: { equipment: 0, operator: 0, input: 0, outputFull: 0 },
    },
  });
  return id;
};

/** Commute of an assignment, cached until the spatial model changes (the route is the costly part). */
const cachedCommute = (world: ProductionWorld, a: Assignment): number | null => {
  const { commutes } = world.production;
  const hit = commutes.get(a.inhabitantId);
  if (hit && hit.revision === world.spatial.revision) return hit.minutes;
  const minutes = commuteOf(world.spatial, world.population, a);
  commutes.set(a.inhabitantId, { revision: world.spatial.revision, minutes });
  return minutes;
};

/** Operators on duty and able: productive presence and a real skill (assigned ≠ able, concept §5.2). */
export const activeOperators = (world: ProductionWorld, machine: Machine, step: number): number => {
  const sheet = getSheet(machine.sheetId);
  const minuteOfDay = step % STEPS_PER_DAY;
  let count = 0;
  for (const a of world.assignments) {
    if (a.room !== machine.room || a.professionId !== sheet.profession) continue;
    const profile = world.profiles.get(a.inhabitantId);
    if (!profile || effectiveness(profile, a.professionId) <= 0) continue;
    const commute = cachedCommute(world, a);
    if (isProductive(world.spatial, world.population, profile, a, step, minuteOfDay, commute)) {
      count++;
    }
  }
  return count;
};

/** Reserves every input of one batch, all or nothing; returns the reservation ids or null. */
const reserveInputs = (
  stocks: Stocks,
  machine: Machine,
  sheet: ProductionSheet,
): number[] | null => {
  const ids: number[] = [];
  for (const { kind, amount } of sheet.inputs) {
    const id = reserve(stocks, machine.inputStocks[kind] as number, amount);
    if (id === null) {
      for (const done of ids) releaseReservation(stocks, done);
      return null;
    }
    ids.push(id);
  }
  return ids;
};

/** Starts as many batches as capacity, inputs and output room allow; returns what stopped it, if anything. */
const startBatches = (
  stocks: Stocks,
  machine: Machine,
  sheet: ProductionSheet,
): BlockReason | null => {
  const output = stocks.stocks[machine.outputStock]!;
  while (machine.batches.length < sheet.capacity) {
    // Output room counts the batches already under way, so that a full tank stops new starts.
    if (roomOf(output) < (machine.batches.length + 1) * sheet.output.amount) return "outputFull";
    const ids = reserveInputs(stocks, machine, sheet);
    if (!ids) return "input";
    for (const id of ids) consumeReservation(stocks, id);
    for (const { kind, amount } of sheet.inputs) {
      machine.totals.consumed[kind] = (machine.totals.consumed[kind] ?? 0) + amount;
    }
    machine.batches.push(sheet.durationSteps);
    machine.totals.started++;
  }
  return null;
};

/** Advances the running batches by one step and delivers the finished ones. */
const advanceBatches = (stocks: Stocks, machine: Machine, sheet: ProductionSheet): void => {
  const left = machine.batches.map((steps) => steps - 1);
  machine.batches = left.filter((steps) => steps > 0);
  for (let i = left.length - machine.batches.length; i > 0; i--) {
    const accepted = deposit(stocks, machine.outputStock, sheet.output.amount);
    machine.totals.completed++;
    machine.totals.produced += accepted;
    machine.totals.wasted += sheet.output.amount - accepted;
  }
};

const block = (machine: Machine, reason: BlockReason): void => {
  machine.status = reason;
  machine.totals.blockedSteps[reason]++;
};

/**
 * Production of water, food and energy. A machine runs only with its equipment working and enough
 * operators on duty; a batch starts only if every input is there, and consumes them at once. Without
 * an operator, running batches pause: nothing is delivered and nothing new is started.
 * Place it before `stocksSystem`, so that its flows fall into the step balance.
 */
export const productionSystem: System<ProductionWorld> = {
  name: "production",
  update(world, { step }) {
    const { stocks } = world;
    for (const machine of world.production.machines) {
      const sheet = getSheet(machine.sheetId);
      if (!machine.working) {
        block(machine, "equipment");
        continue;
      }
      if (activeOperators(world, machine, step) < sheet.operators) {
        block(machine, "operator");
        continue;
      }
      const reason = startBatches(stocks, machine, sheet);
      if (machine.batches.length === 0) {
        block(machine, reason ?? "input");
        continue;
      }
      machine.status = "producing";
      advanceBatches(stocks, machine, sheet);
    }
  },
};

const REASON_TEXT: Record<BlockReason, string> = {
  equipment: "equipment out of service",
  operator: "no operator on duty",
  input: "missing input",
  outputFull: "output stock full",
};

/** Human-readable account of a machine: status, what it took, what it gave, why it stood still. */
export const explainMachine = (machine: Machine): string[] => {
  const sheet = getSheet(machine.sheetId);
  const { totals } = machine;
  const consumed = sheet.inputs.map(({ kind }) => `${totals.consumed[kind] ?? 0} ${kind}`);
  const refused = totals.wasted > 0 ? ` (${totals.wasted} refused, no room)` : "";
  const lines = [
    `${sheet.label} (machine ${machine.id}): ${machine.status}`,
    `  batches: ${totals.started} started, ${totals.completed} completed, ${machine.batches.length} under way`,
    `  consumed: ${consumed.join(", ")}; produced: ${totals.produced} ${sheet.output.kind}${refused}`,
  ];
  for (const [reason, steps] of Object.entries(totals.blockedSteps) as [BlockReason, number][]) {
    if (steps > 0) lines.push(`  blocked ${steps} steps: ${REASON_TEXT[reason]}`);
  }
  return lines;
};

/** Account of one stock over the current step: opening quantity and flows, down to what is there now. */
export const explainStock = (stocks: Stocks, id: number): string => {
  const stock = stocks.stocks[id];
  if (!stock) throw new Error(`Unknown stock ${id}`);
  const { opening, inflow, outflow, lost } = stock.flow;
  return (
    `${stock.kind} stock ${id} (node ${stock.node}): opening ${opening} + in ${inflow}` +
    ` - out ${outflow} - lost ${lost} = ${stock.available} (${freeOf(stock)} free)`
  );
};
