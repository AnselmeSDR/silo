import type { HealthStatus } from "../population";
import type { SimTime, Speed } from "../core";
import type { NodeId } from "../spatial";

/** Read-only view of an inhabitant: what a renderer or a decider may know. */
export interface InhabitantView {
  readonly id: number;
  readonly health: HealthStatus;
  readonly position: NodeId;
  readonly travelling: boolean;
}

export interface PopulationSummary {
  readonly total: number;
  readonly alive: number;
  readonly dead: number;
  readonly travelling: number;
  readonly byHealth: Readonly<Record<HealthStatus, number>>;
}

export interface MovementSummary {
  readonly waitedSteps: number;
  readonly routesComputed: number;
  readonly abandoned: number;
  readonly completed: number;
}

export interface ProductionSummary {
  /** Cumulated output and consumption per resource kind since the start. */
  readonly produced: Readonly<Record<string, number>>;
  readonly consumed: Readonly<Record<string, number>>;
  readonly machines: readonly {
    readonly label: string;
    readonly status: string;
    readonly completed: number;
  }[];
}

/** Whole-state summary (diagnostic access level, concept §15.2). */
export interface Summary {
  readonly time: SimTime;
  readonly population: PopulationSummary;
  readonly movement: MovementSummary;
  readonly stocks: Readonly<Record<string, number>>;
  readonly production: ProductionSummary;
}

/**
 * The only door from the presentation layer to the simulation state (concept §15.1-15.2).
 * Returns plain copies: mutating them never touches the engine.
 */
export interface Observer {
  readonly time: SimTime;
  readonly speed: Speed;
  inhabitants(): InhabitantView[];
  inhabitant(id: number): InhabitantView | undefined;
  summary(): Summary;
}
