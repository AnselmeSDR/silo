import type { NodeId } from "../spatial";

/** Resources of concept §7.1; quantities are integers in the smallest sub-unit of D-06. */
export const RESOURCE_KINDS = ["water", "food", "energy", "spareParts"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** Flows of the current step on one stock; `opening` is the quantity at the start of the step. */
export interface StepFlow {
  opening: number;
  /** Everything that came in: deposits and transfers received. */
  inflow: number;
  /** Everything that went out: withdrawals and transfers sent. */
  outflow: number;
  lost: number;
}

/** Local stock (tank, warehouse, canteen), D-06: global figures are only sums for display. */
export interface Stock {
  id: number;
  node: NodeId;
  kind: ResourceKind;
  capacity: number;
  /** Quantity present, reserved part included. */
  available: number;
  /** Part of `available` promised to a task: nobody else can take it. */
  reserved: number;
  /** Spoilage or leakage applied by the system at every step, limited to the free quantity. */
  lossPerStep: number;
  flow: StepFlow;
}

export interface Reservation {
  id: number;
  stockId: number;
  amount: number;
}

/** Cumulated flows crossing the boundary of the stocks of one kind (transfers excluded). */
export interface KindTotals {
  initial: number;
  produced: number;
  consumed: number;
  lost: number;
  /** Requested but not delivered: recorded, never carried as a debt (D-06). */
  shortage: number;
}

/** Why a quantity changed (§13.4, minimal version). */
export const CAUSES = ["production", "consumption", "loss", "transfer"] as const;
export type Cause = (typeof CAUSES)[number];

/** One variation of one stock; `delta` is signed, `shortage` is what was asked but not delivered. */
export interface JournalEntry {
  step: number;
  stockId: number;
  kind: ResourceKind;
  cause: Cause;
  delta: number;
  shortage: number;
  /** Other end of a transfer. */
  counterpart?: number;
}

/** Bounded log of the causes: the oldest entries are dropped first. */
export interface Journal {
  limit: number;
  entries: JournalEntry[];
  /** Entries dropped to respect the limit. */
  dropped: number;
}

export interface Stocks {
  /** Step the flows are currently attributed to; moved forward by `stocksSystem`. */
  step: number;
  journal: Journal;
  stocks: Stock[];
  reservations: Record<number, Reservation>;
  nextReservationId: number;
  totals: Record<ResourceKind, KindTotals>;
}

export interface StockOptions {
  node: NodeId;
  kind: ResourceKind;
  capacity: number;
  /** Starting quantity, at most `capacity`. Default 0. */
  initial?: number;
  lossPerStep?: number;
}

/** The state the stocks system works on. */
export interface StocksWorld {
  stocks: Stocks;
}
