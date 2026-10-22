import type { Population } from "../population";
import type { EdgeKind, NodeId, SpatialModel } from "../spatial";

/** An inhabitant on the way to a node. Plain data, JSON-safe. */
export interface Trip {
  destination: NodeId;
  /** Nodes to visit, from the start node to the destination. */
  route: NodeId[];
  /** Index in `route` of the node being walked to (or about to be). */
  next: number;
  /** Walking time left on the edge in progress, in ms; 0 when standing on a node. */
  edgeMsLeft: number;
  /** Consecutive steps spent queueing at a saturated passage. */
  waitedSteps: number;
  /** Spatial revision the route was computed on. */
  revision: number;
}

export interface MovementStats {
  /** Inhabitant-steps lost queueing at saturated passages. */
  waitedSteps: number;
  /** Routes computed since the start (cache misses). */
  routesComputed: number;
  /** Trips given up because the destination became unreachable. */
  abandoned: number;
  /** Trips that reached their destination. */
  completed: number;
}

export interface Movement {
  /** Active trips by inhabitant id (at most one per inhabitant). */
  trips: Record<number, Trip>;
  /** Passages entered during the current step, by edge index; reset every step. */
  usage: Record<number, number>;
  /** People per step each kind of passage lets through (both directions together). */
  capacityPerStep: Record<EdgeKind, number>;
  stats: MovementStats;
}

/** The state the movement system works on. */
export interface MovementWorld {
  spatial: SpatialModel;
  population: Population;
  movement: Movement;
}

export interface MovementOptions {
  /** Overrides DEFAULT_CAPACITY_PER_STEP, kind by kind. */
  capacityPerStep?: Partial<Record<EdgeKind, number>>;
}
