import type { System } from "../core";
import { isAlive } from "../population";
import { findPath, type EdgeKind, type Link, type NodeId, type Path } from "../spatial";
import type { Movement, MovementOptions, MovementWorld, Trip } from "./types";

/** One step is one simulated minute (D-02, D-06). */
const STEP_MS = 60_000;

/**
 * Widths of D-08 (m) at 1 person/m/s over a 60 s step. D-08 gives no door width: 1.5 m assumed.
 * A passage is shared by both directions.
 */
export const DEFAULT_CAPACITY_PER_STEP: Record<EdgeKind, number> = {
  stair: 222,
  walkway: 216,
  gallery: 390,
  artery: 444,
  door: 90,
};

export const createMovement = ({ capacityPerStep }: MovementOptions = {}): Movement => {
  const capacity = { ...DEFAULT_CAPACITY_PER_STEP, ...capacityPerStep };
  if (Object.values(capacity).some((value) => !Number.isInteger(value) || value < 1)) {
    throw new Error("capacity must be an integer >= 1");
  }
  return {
    trips: {},
    usage: {},
    capacityPerStep: capacity,
    stats: { waitedSteps: 0, routesComputed: 0, abandoned: 0, completed: 0 },
  };
};

/**
 * Routes are computed on demand and kept until the spatial revision changes (§15.3):
 * congestion never triggers a recompute. Derived data, never saved.
 */
const routeCaches = new WeakMap<Movement, { revision: number; routes: Map<string, Path | null> }>();

const routeBetween = (world: MovementWorld, from: NodeId, to: NodeId): Path | null => {
  const { spatial, movement } = world;
  let cache = routeCaches.get(movement);
  if (cache?.revision !== spatial.revision) {
    cache = { revision: spatial.revision, routes: new Map() };
    routeCaches.set(movement, cache);
  }
  const key = `${from}>${to}`;
  if (cache.routes.has(key)) return cache.routes.get(key) ?? null;
  const path = findPath(spatial, from, to);
  movement.stats.routesComputed++;
  cache.routes.set(key, path);
  return path;
};

export const isTravelling = (movement: Movement, id: number): boolean => id in movement.trips;

/** Starts a trip from the inhabitant's position; false if none starts (dead, travelling, unreachable). */
export const requestTrip = (world: MovementWorld, id: number, destination: NodeId): boolean => {
  const { population, movement, spatial } = world;
  const inhabitant = population.inhabitants[id];
  if (!inhabitant) throw new Error(`unknown inhabitant ${id}`);
  if (!spatial.nodes[destination]) throw new Error(`unknown node ${destination}`);
  if (!isAlive(inhabitant) || isTravelling(movement, id)) return false;
  if (inhabitant.position === destination) return false;
  const path = routeBetween(world, inhabitant.position, destination);
  if (!path) return false;
  movement.trips[id] = {
    destination,
    route: path.nodes,
    next: 1,
    edgeMsLeft: 0,
    waitedSteps: 0,
    revision: spatial.revision,
  };
  return true;
};

/** Cheapest passage between two adjacent nodes. */
const linkBetween = (links: readonly Link[], to: NodeId): Link => {
  let best: Link | null = null;
  for (const link of links) {
    if (link.to === to && (!best || link.ms < best.ms)) best = link;
  }
  return best as Link;
};

/** Reroutes after a spatial change, from the node being walked to if an edge is in progress. */
const reroute = (world: MovementWorld, trip: Trip): boolean => {
  const walking = trip.edgeMsLeft > 0;
  const origin = trip.route[walking ? trip.next : trip.next - 1]!;
  const path = routeBetween(world, origin, trip.destination);
  if (!path) return false;
  // Keep the node being left so the edge in progress still ends where it was heading.
  trip.route = walking ? [trip.route[trip.next - 1]!, ...path.nodes] : path.nodes;
  trip.next = 1;
  trip.revision = world.spatial.revision;
  return true;
};

/** Walks one step; true when the destination is reached. */
const advanceTrip = (world: MovementWorld, id: number, trip: Trip): boolean => {
  const { spatial, population, movement } = world;
  const inhabitant = population.inhabitants[id]!;
  let budget = STEP_MS;
  for (;;) {
    if (trip.edgeMsLeft > 0) {
      const spent = Math.min(budget, trip.edgeMsLeft);
      trip.edgeMsLeft -= spent;
      budget -= spent;
      if (trip.edgeMsLeft > 0) return false;
      inhabitant.position = trip.route[trip.next]!;
      trip.next++;
    }
    if (trip.next >= trip.route.length) return true;
    if (budget <= 0) return false;

    const link = linkBetween(spatial.links[trip.route[trip.next - 1]!]!, trip.route[trip.next]!);
    const used = movement.usage[link.edge] ?? 0;
    if (used >= movement.capacityPerStep[spatial.edges[link.edge]!.kind]) {
      // Saturated passage: queue, the rest of the step is lost.
      trip.waitedSteps++;
      movement.stats.waitedSteps++;
      return false;
    }
    movement.usage[link.edge] = used + 1;
    trip.waitedSteps = 0;
    trip.edgeMsLeft = link.ms;
  }
};

/** Moves every travelling inhabitant for one step (D-02: shuffled order, own PRNG stream). */
export const movementSystem: System<MovementWorld> = {
  name: "movement",
  update(world, ctx) {
    const { movement, population, spatial } = world;
    movement.usage = {};
    for (const id of ctx.shuffle(Object.keys(movement.trips).map(Number))) {
      const trip = movement.trips[id]!;
      if (!isAlive(population.inhabitants[id]!)) {
        delete movement.trips[id];
        continue;
      }
      // Recompute only when the spatial state changed since the route was made.
      if (trip.revision !== spatial.revision && !reroute(world, trip)) {
        delete movement.trips[id];
        movement.stats.abandoned++;
        continue;
      }
      if (advanceTrip(world, id, trip)) {
        delete movement.trips[id];
        movement.stats.completed++;
      }
    }
  },
};
