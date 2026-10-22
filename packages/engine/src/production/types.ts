import type { Population } from "../population";
import type { SpatialModel } from "../spatial";
import type { ResourceKind, StocksWorld } from "../stocks";
import type { Assignment, ProfessionId, WorkProfile } from "../work";

/** One quantity of one resource, in the sub-unit of D-06. */
export interface Quantity {
  kind: ResourceKind;
  amount: number;
}

/** Operating sheet of a production line (concept §7): what goes in, what comes out, who runs it. */
export interface ProductionSheet {
  id: string;
  label: string;
  inputs: readonly Quantity[];
  output: Quantity;
  /** Steps of staffed operation needed to finish one batch. */
  durationSteps: number;
  /** Equipment that must be in working order, as text for the interface. */
  equipment: string;
  /** Profession whose real skill runs the line. */
  profession: ProfessionId;
  /** Operators needed on duty at the same time. */
  operators: number;
  /** Batches that can run in parallel on one machine. */
  capacity: number;
}

/** Why a machine did not advance at a step, in priority order of the checks. */
export type BlockReason = "equipment" | "operator" | "input" | "outputFull";

export type MachineStatus = "producing" | BlockReason;

/** A machine: one sheet installed in one room, wired to the stocks it draws from and feeds. */
export interface Machine {
  id: number;
  sheetId: string;
  room: number;
  /** Stock holding each input kind. */
  inputStocks: Partial<Record<ResourceKind, number>>;
  outputStock: number;
  /** False when broken or out of service. */
  working: boolean;
  /** Batches under way, each with the steps still to run. */
  batches: number[];
  status: MachineStatus;
  /** Cumulated figures, for explaining the flows. */
  totals: {
    started: number;
    completed: number;
    consumed: Partial<Record<ResourceKind, number>>;
    produced: number;
    /** Output refused for lack of room at completion. */
    wasted: number;
    blockedSteps: Record<BlockReason, number>;
  };
}

export interface ProductionState {
  machines: Machine[];
}

/** The state the production system works on. */
export interface ProductionWorld extends StocksWorld {
  spatial: SpatialModel;
  population: Population;
  assignments: readonly Assignment[];
  profiles: ReadonlyMap<number, WorkProfile>;
  production: ProductionState;
}
