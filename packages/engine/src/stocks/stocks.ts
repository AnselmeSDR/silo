import type { System } from "../core";
import {
  CAUSES,
  RESOURCE_KINDS,
  type Cause,
  type JournalEntry,
  type ResourceKind,
  type Stock,
  type StockOptions,
  type Stocks,
  type StocksWorld,
} from "./types";

const isQuantity = (value: number, min: number): boolean => Number.isInteger(value) && value >= min;

export const DEFAULT_JOURNAL_LIMIT = 10_000;

export const createStocks = (journalLimit = DEFAULT_JOURNAL_LIMIT): Stocks => {
  if (!isQuantity(journalLimit, 1)) throw new Error("journalLimit must be an integer >= 1");
  return newStocks(journalLimit);
};

const newStocks = (journalLimit: number): Stocks => ({
  step: 0,
  journal: { limit: journalLimit, entries: [], dropped: 0 },
  stocks: [],
  reservations: {},
  nextReservationId: 0,
  totals: Object.fromEntries(
    RESOURCE_KINDS.map((kind) => [
      kind,
      { initial: 0, produced: 0, consumed: 0, lost: 0, shortage: 0 },
    ]),
  ) as Stocks["totals"],
});

/** Adds a stock and returns its id. */
export const addStock = (
  stocks: Stocks,
  { node, kind, capacity, initial = 0, lossPerStep = 0 }: StockOptions,
): number => {
  if (!isQuantity(capacity, 1)) throw new Error("capacity must be an integer >= 1");
  if (!isQuantity(initial, 0) || initial > capacity) {
    throw new Error("initial must be an integer in 0..capacity");
  }
  if (!isQuantity(lossPerStep, 0)) throw new Error("lossPerStep must be an integer >= 0");
  const id = stocks.stocks.length;
  stocks.stocks.push({
    id,
    node,
    kind,
    capacity,
    available: initial,
    reserved: 0,
    lossPerStep,
    flow: { opening: initial, inflow: 0, outflow: 0, lost: 0 },
  });
  stocks.totals[kind].initial += initial;
  return id;
};

/** Records a variation (or a shortage) with its cause; nothing is logged when nothing happened. */
const record = (
  stocks: Stocks,
  stock: Stock,
  cause: Cause,
  delta: number,
  shortage = 0,
  counterpart?: number,
): void => {
  if (delta === 0 && shortage === 0) return;
  const entry: JournalEntry = {
    step: stocks.step,
    stockId: stock.id,
    kind: stock.kind,
    cause,
    delta,
    shortage,
  };
  if (counterpart !== undefined) entry.counterpart = counterpart;
  const { journal } = stocks;
  journal.entries.push(entry);
  const excess = journal.entries.length - journal.limit;
  if (excess <= 0) return;
  journal.entries.splice(0, excess);
  journal.dropped += excess;
};

const stockOf = (stocks: Stocks, id: number): Stock => {
  const stock = stocks.stocks[id];
  if (!stock) throw new Error(`Unknown stock ${id}`);
  return stock;
};

const reservationOf = (stocks: Stocks, reservationId: number) => {
  const reservation = stocks.reservations[reservationId];
  if (!reservation) throw new Error(`Unknown reservation ${reservationId}`);
  return reservation;
};

/** Quantity nobody has reserved. */
export const freeOf = (stock: Stock): number => stock.available - stock.reserved;

/** Room left before the stock is full. */
export const roomOf = (stock: Stock): number => stock.capacity - stock.available;

const checkAmount = (amount: number): void => {
  if (!isQuantity(amount, 0)) throw new Error("amount must be an integer >= 0");
};

/** Brings resource in from outside (production, delivery); returns what fitted, the excess is refused. */
export const deposit = (stocks: Stocks, id: number, amount: number): number => {
  checkAmount(amount);
  const stock = stockOf(stocks, id);
  const accepted = Math.min(amount, roomOf(stock));
  stock.available += accepted;
  stock.flow.inflow += accepted;
  stocks.totals[stock.kind].produced += accepted;
  record(stocks, stock, "production", accepted);
  return accepted;
};

/** Takes resource out of the system (consumption); limited to the free quantity, the gap is a shortage. */
export const withdraw = (stocks: Stocks, id: number, amount: number): number => {
  checkAmount(amount);
  const stock = stockOf(stocks, id);
  const taken = Math.min(amount, freeOf(stock));
  stock.available -= taken;
  stock.flow.outflow += taken;
  stocks.totals[stock.kind].consumed += taken;
  stocks.totals[stock.kind].shortage += amount - taken;
  record(stocks, stock, "consumption", -taken, amount - taken);
  return taken;
};

/** Loses free resource (spoilage, leakage); returns the quantity actually lost. */
export const lose = (stocks: Stocks, id: number, amount: number): number => {
  checkAmount(amount);
  const stock = stockOf(stocks, id);
  const lost = Math.min(amount, freeOf(stock));
  stock.available -= lost;
  stock.flow.lost += lost;
  stocks.totals[stock.kind].lost += lost;
  record(stocks, stock, "loss", -lost);
  return lost;
};

/** Reserves free quantity so that no other task gets it; returns the reservation id, or null if too little is free. */
export const reserve = (stocks: Stocks, id: number, amount: number): number | null => {
  if (!isQuantity(amount, 1)) throw new Error("amount must be an integer >= 1");
  const stock = stockOf(stocks, id);
  if (freeOf(stock) < amount) return null;
  stock.reserved += amount;
  const reservationId = stocks.nextReservationId++;
  stocks.reservations[reservationId] = { id: reservationId, stockId: id, amount };
  return reservationId;
};

/** Gives the reserved quantity back to the free stock. */
export const releaseReservation = (stocks: Stocks, reservationId: number): void => {
  const reservation = reservationOf(stocks, reservationId);
  stockOf(stocks, reservation.stockId).reserved -= reservation.amount;
  delete stocks.reservations[reservationId];
};

/** Consumes a reservation; returns the quantity taken (always the reserved amount, it is guaranteed). */
export const consumeReservation = (stocks: Stocks, reservationId: number): number => {
  const reservation = reservationOf(stocks, reservationId);
  const stock = stockOf(stocks, reservation.stockId);
  stock.reserved -= reservation.amount;
  stock.available -= reservation.amount;
  stock.flow.outflow += reservation.amount;
  stocks.totals[stock.kind].consumed += reservation.amount;
  record(stocks, stock, "consumption", -reservation.amount);
  delete stocks.reservations[reservationId];
  return reservation.amount;
};

/**
 * Moves resource between two stocks of the same kind; nothing is created or destroyed.
 * Limited by the free quantity of the source (or the reservation, if given) and the room of the target.
 */
export const transfer = (
  stocks: Stocks,
  fromId: number,
  toId: number,
  amount: number,
  reservationId?: number,
): number => {
  checkAmount(amount);
  const from = stockOf(stocks, fromId);
  const to = stockOf(stocks, toId);
  if (from.kind !== to.kind) throw new Error("transfer needs two stocks of the same kind");
  if (from === to) return 0;
  const reservation = reservationId === undefined ? null : reservationOf(stocks, reservationId);
  if (reservation && reservation.stockId !== fromId) {
    throw new Error("reservation is on another stock");
  }
  const moved = Math.min(amount, reservation ? reservation.amount : freeOf(from), roomOf(to));
  if (reservation) {
    reservation.amount -= moved;
    from.reserved -= moved;
    if (reservation.amount === 0) delete stocks.reservations[reservation.id];
  }
  from.available -= moved;
  from.flow.outflow += moved;
  to.available += moved;
  to.flow.inflow += moved;
  record(stocks, from, "transfer", -moved, 0, to.id);
  record(stocks, to, "transfer", moved, 0, from.id);
  return moved;
};

export interface CauseFilter {
  stockId?: number;
  kind?: ResourceKind;
  /** Only entries from this step on. */
  sinceStep?: number;
}

/** Logged variations matching the filter, oldest first: why a stock moved or ran short. */
export const causesOf = (stocks: Stocks, filter: CauseFilter = {}): JournalEntry[] =>
  stocks.journal.entries.filter(
    (e) =>
      (filter.stockId === undefined || e.stockId === filter.stockId) &&
      (filter.kind === undefined || e.kind === filter.kind) &&
      (filter.sinceStep === undefined || e.step >= filter.sinceStep),
  );

/** Net variation and shortage per cause, to read a series of entries at a glance. */
export const sumByCause = (
  entries: readonly JournalEntry[],
): Record<Cause, { delta: number; shortage: number }> => {
  const sums = Object.fromEntries(CAUSES.map((c) => [c, { delta: 0, shortage: 0 }])) as Record<
    Cause,
    { delta: number; shortage: number }
  >;
  for (const e of entries) {
    sums[e.cause].delta += e.delta;
    sums[e.cause].shortage += e.shortage;
  }
  return sums;
};

/** Sum of the quantities present for one kind: a display figure, not the supply of any place. */
export const totalOf = (stocks: Stocks, kind: ResourceKind): number =>
  stocks.stocks.reduce((sum, stock) => (stock.kind === kind ? sum + stock.available : sum), 0);

/** Every broken rule of the step balance (§7.1) and of the stock bounds; empty when consistent. */
export const verifyStocks = (stocks: Stocks): string[] => {
  const errors: string[] = [];
  const reservedBy = new Map<number, number>();
  for (const { stockId, amount } of Object.values(stocks.reservations)) {
    reservedBy.set(stockId, (reservedBy.get(stockId) ?? 0) + amount);
  }
  for (const stock of stocks.stocks) {
    const { opening, inflow, outflow, lost } = stock.flow;
    if (stock.available !== opening + inflow - outflow - lost) {
      errors.push(
        `stock ${stock.id}: ${stock.available} != ${opening} + ${inflow} - ${outflow} - ${lost}`,
      );
    }
    if (
      stock.reserved < 0 ||
      stock.reserved > stock.available ||
      stock.available > stock.capacity
    ) {
      errors.push(`stock ${stock.id}: needs 0 <= reserved <= available <= capacity`);
    }
    if ((reservedBy.get(stock.id) ?? 0) !== stock.reserved) {
      errors.push(`stock ${stock.id}: reserved differs from its reservations`);
    }
  }
  for (const kind of RESOURCE_KINDS) {
    const { initial, produced, consumed, lost } = stocks.totals[kind];
    if (totalOf(stocks, kind) !== initial + produced - consumed - lost) {
      errors.push(`${kind}: total is not initial + produced - consumed - lost`);
    }
  }
  return errors;
};

/**
 * Applies the losses, checks the balance of the step and opens the next one: run it last, so that the
 * flows of the other systems fall into the same step.
 */
export const stocksSystem: System<StocksWorld> = {
  name: "stocks",
  update({ stocks }, { step }) {
    stocks.step = step;
    for (const stock of stocks.stocks) {
      if (stock.lossPerStep > 0) lose(stocks, stock.id, stock.lossPerStep);
    }
    const errors = verifyStocks(stocks);
    if (errors.length > 0) throw new Error(`Stock balance broken:\n- ${errors.join("\n- ")}`);
    for (const stock of stocks.stocks) {
      stock.flow = { opening: stock.available, inflow: 0, outflow: 0, lost: 0 };
    }
    stocks.step = step + 1;
  },
};
