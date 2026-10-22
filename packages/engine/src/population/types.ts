import type { NodeId } from "../spatial";

export type HealthStatus = "healthy" | "ill" | "injured" | "dead";

/** Persistent inhabitant (concept §4.1): never removed, whatever is displayed or alive. */
export interface Inhabitant {
  /** Stable identifier, equal to the index in `Population.inhabitants`. */
  id: number;
  /** Day of birth (negative before the start); age is derived from it, see `ageOf`. */
  birthDay: number;
  health: HealthStatus;
  /** Simulation step of the death; null while alive. The entity stays after it. */
  diedAtStep: number | null;
  /** Housing room (spatial node id). */
  residence: NodeId;
  /** Current position (spatial node id). */
  position: NodeId;
}

export interface Population {
  inhabitants: Inhabitant[];
}

/** Age class weights of D-06 (age ranges are inclusive, in years). */
export interface AgeClass {
  minAge: number;
  maxAge: number;
  weight: number;
}

export interface PopulationOptions {
  /** Number of inhabitants, from a few dozens up to MAX_POPULATION. */
  count: number;
  seed: bigint | number;
  /** Age distribution; defaults to DEFAULT_AGE_CLASSES (D-06). */
  ageClasses?: readonly AgeClass[];
}
