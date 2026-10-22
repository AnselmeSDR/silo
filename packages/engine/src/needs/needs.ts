import { STEPS_PER_DAY, createStream, timeOfStep, type System } from "../core";
import { isTravelling, requestTrip } from "../movement";
import { isAlive, setHealth } from "../population";
import { freeOf, withdraw } from "../stocks";
import {
  GAUGE_MAX,
  type InhabitantNeeds,
  type Needs,
  type NeedsOptions,
  type NeedsWorld,
} from "./types";

type Consumable = "water" | "food";

/** Daily intake at full satisfaction (D-06): water 3 L (in mL), food 2 000 kcal. */
export const DAILY_INTAKE: Record<Consumable, number> = { water: 3_000_000, food: 2_000 };

/** Steps for a full gauge to empty at average metabolism. */
const STEPS_TO_EMPTY = { water: STEPS_PER_DAY / 2, food: STEPS_PER_DAY, sleep: 960 } as const;
/** Quantity that refills an empty gauge: water empties in 12 h, so half the daily intake. */
const FULL_REFILL: Record<Consumable, number> = {
  water: DAILY_INTAKE.water / 2,
  food: DAILY_INTAKE.food,
};

/** Sleep window (minute of the day): 22:00-06:00, at home; an empty gauge refills in 8 h. */
export const SLEEP_START = 22 * 60;
export const SLEEP_END = 6 * 60;
const SLEEP_RECOVERY_PER_STEP = Math.round(GAUGE_MAX / 480);

/** Below `SEEK_THRESHOLD` the inhabitant looks for the resource; below `COMFORT_THRESHOLD` output drops. */
export const SEEK_THRESHOLD = 4_000;
export const COMFORT_THRESHOLD = 6_000;
/** Incapacity threshold: 1 500 at resilience 50, ±600 across the 0-100 range. */
const COLLAPSE_BASE = 1_500;
const COLLAPSE_SPREAD = 1_200;
/** Health gauge hysteresis: falls ill below, recovers above. */
const ILL_BELOW = 4_000;
const WELL_ABOVE = 6_000;
const HEALTH_LOSS_PER_STEP = 5;
const HEALTH_GAIN_PER_STEP = 1;

export const isNight = (minuteOfDay: number): boolean =>
  minuteOfDay >= SLEEP_START || minuteOfDay < SLEEP_END;

export const createNeeds = ({ count, seed }: NeedsOptions): Needs => {
  const prng = createStream(seed, "needs-init");
  const byInhabitant: InhabitantNeeds[] = [];
  for (let id = 0; id < count; id++) {
    byInhabitant.push({
      gauges: { water: GAUGE_MAX, food: GAUGE_MAX, sleep: GAUGE_MAX, health: GAUGE_MAX },
      traits: { metabolism: 800 + prng.int(401), resilience: prng.int(101) },
      seeking: null,
      incapacitated: false,
    });
  }
  return { byInhabitant };
};

export const needsOf = (needs: Needs, id: number): InhabitantNeeds => {
  const found = needs.byInhabitant[id];
  if (!found) throw new Error(`unknown inhabitant ${id}`);
  return found;
};

/** Gauge value under which the inhabitant can no longer work: a resilient one holds on longer. */
export const collapseThreshold = (resilience: number): number =>
  Math.round(COLLAPSE_BASE + COLLAPSE_SPREAD / 2 - (COLLAPSE_SPREAD * resilience) / 100);

/**
 * Output factor 0-1 caused by unmet needs, to multiply with `effectiveness`.
 * The same shortfall costs a resilient inhabitant less than a fragile one.
 */
export const productivityFactor = (needs: Needs, id: number): number => {
  const { gauges, traits, incapacitated } = needsOf(needs, id);
  if (incapacitated) return 0;
  const sensitivity = 1 - (traits.resilience / 100) * 0.6;
  let penalty = 0;
  for (const kind of ["water", "food", "sleep"] as const) {
    const shortfall = Math.max(0, COMFORT_THRESHOLD - gauges[kind]) / COMFORT_THRESHOLD;
    penalty += shortfall * 0.5 * sensitivity;
  }
  return Math.max(0, 1 - penalty);
};

const deplete = (state: InhabitantNeeds, kind: keyof typeof STEPS_TO_EMPTY): void => {
  const perStep = (GAUGE_MAX / STEPS_TO_EMPTY[kind]) * (state.traits.metabolism / 1000);
  state.gauges[kind] = Math.max(0, state.gauges[kind] - Math.round(perStep));
};

/** Eats or drinks at the inhabitant's node: real withdrawal, gauge restored by what was delivered. */
const consume = (world: NeedsWorld, id: number, kind: Consumable): boolean => {
  const state = needsOf(world.needs, id);
  const { position } = world.population.inhabitants[id]!;
  const stock = world.stocks.stocks.find(
    (s) => s.kind === kind && s.node === position && freeOf(s) > 0,
  );
  if (!stock) return false;
  const wanted = Math.ceil(((GAUGE_MAX - state.gauges[kind]) * FULL_REFILL[kind]) / GAUGE_MAX);
  const taken = withdraw(world.stocks, stock.id, wanted);
  const restored = Math.floor((taken * GAUGE_MAX) / FULL_REFILL[kind]);
  state.gauges[kind] = Math.min(GAUGE_MAX, state.gauges[kind] + restored);
  return true;
};

/** Heads for `node` when movement is wired in; without it the inhabitant just stays "seeking". */
const tryReach = (world: NeedsWorld, id: number, node: number): void => {
  const { movement, spatial, population } = world;
  if (!movement || !spatial || isTravelling(movement, id)) return;
  requestTrip({ spatial, population, movement }, id, node);
};

const updateInhabitant = (
  world: NeedsWorld,
  id: number,
  minuteOfDay: number,
  step: number,
): void => {
  const state = needsOf(world.needs, id);
  const inhabitant = world.population.inhabitants[id]!;
  const { gauges } = state;

  deplete(state, "water");
  deplete(state, "food");
  const asleep = isNight(minuteOfDay) && inhabitant.position === inhabitant.residence;
  if (asleep) gauges.sleep = Math.min(GAUGE_MAX, gauges.sleep + SLEEP_RECOVERY_PER_STEP);
  else deplete(state, "sleep");

  state.seeking = null;
  for (const kind of ["water", "food"] as const) {
    if (gauges[kind] > SEEK_THRESHOLD || consume(world, id, kind)) continue;
    state.seeking ??= kind;
    // Nothing here: head for the nearest-by-id stock of that kind that still has something free.
    const supply = world.stocks.stocks.find((s) => s.kind === kind && freeOf(s) > 0);
    if (supply) tryReach(world, id, supply.node);
  }
  if (gauges.sleep <= SEEK_THRESHOLD && isNight(minuteOfDay) && !asleep) {
    state.seeking ??= "sleep";
    tryReach(world, id, inhabitant.residence);
  }

  // Health follows the material needs: it drains while water or food is empty, recovers otherwise.
  if (gauges.water === 0 || gauges.food === 0) {
    gauges.health = Math.max(0, gauges.health - HEALTH_LOSS_PER_STEP);
  } else if (gauges.water > COMFORT_THRESHOLD && gauges.food > COMFORT_THRESHOLD) {
    gauges.health = Math.min(GAUGE_MAX, gauges.health + HEALTH_GAIN_PER_STEP);
  }
  if (inhabitant.health === "healthy" && gauges.health < ILL_BELOW) {
    setHealth(world.population, id, "ill");
  } else if (inhabitant.health === "ill" && gauges.health > WELL_ABOVE) {
    setHealth(world.population, id, "healthy");
  }

  const limit = collapseThreshold(state.traits.resilience);
  state.incapacitated =
    inhabitant.health === "ill" ||
    gauges.water < limit ||
    gauges.food < limit ||
    gauges.sleep < limit;

  const profile = world.profiles?.get(id);
  if (profile && state.incapacitated) {
    profile.absentUntilStep = Math.max(profile.absentUntilStep ?? 0, step + 1);
  }
};

/** Needs system: depletion, consumption from real stocks, seeking, health, incapacity. Run before movement. */
export const needsSystem: System<NeedsWorld> = {
  name: "needs",
  update(world, ctx) {
    const { minuteOfDay } = timeOfStep(ctx.step);
    const living = world.population.inhabitants.filter(isAlive).map((i) => i.id);
    // Shuffled order: who reaches a scarce stock first is not decided by the id (D-02).
    for (const id of ctx.shuffle(living)) updateInhabitant(world, id, minuteOfDay, ctx.step);
  },
};
