import type { Decisions } from "../decision";
import type { MovementWorld } from "../movement";
import type { Population } from "../population";
import type { StocksWorld } from "../stocks";
import type { WorkProfile } from "../work";

/** Basic needs of concept §5.1 handled here; security and social needs come with later tickets. */
export const NEED_KINDS = ["water", "food", "sleep", "health"] as const;
export type NeedKind = (typeof NEED_KINDS)[number];

/** Gauges are integers in 0..GAUGE_MAX (0 = empty, GAUGE_MAX = fully satisfied): no float drift (D-06). */
export const GAUGE_MAX = 10_000;

/** What differs from one inhabitant to the next (drawn once, then fixed). */
export interface NeedTraits {
  /** Speed of water/food/sleep depletion, in permille of the baseline (1000 = average). */
  metabolism: number;
  /** 0-100: how long the inhabitant keeps working and holds on while a need is unmet. */
  resilience: number;
}

export type Gauges = Record<NeedKind, number>;

export interface InhabitantNeeds {
  gauges: Gauges;
  traits: NeedTraits;
  /** Resource the inhabitant is currently looking for; null when nothing is missing. */
  seeking: "water" | "food" | "sleep" | null;
  /** True while the unmet needs keep the inhabitant from working. */
  incapacitated: boolean;
}

export interface Needs {
  /** Indexed by inhabitant id. */
  byInhabitant: InhabitantNeeds[];
}

export interface NeedsOptions {
  count: number;
  seed: bigint | number;
}

/** The state the needs system works on; `movement`/`spatial` and `profiles` are optional links to other systems. */
export interface NeedsWorld
  extends StocksWorld, Partial<Pick<MovementWorld, "movement" | "spatial">> {
  population: Population;
  needs: Needs;
  /** When given, an incapacitated inhabitant gets `absentUntilStep` set, so the work side sees an absence. */
  profiles?: Map<number, WorkProfile>;
  /** When present, the decision loop starts the trips: the needs system only consumes and updates. */
  decisions?: Decisions;
}
