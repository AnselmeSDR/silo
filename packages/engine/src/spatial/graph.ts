import type { Link, NodeId, Path, Room, ServiceState, SpatialModel } from "./types";

/** The node every journey into the silo starts from: the central stair at level 0. */
export const stairRoot = (): NodeId => 0;

export const getRoom = (model: SpatialModel, id: NodeId): Room => {
  const node = model.nodes[id];
  if (node?.kind !== "room") throw new Error(`node ${id} is not a room`);
  return node;
};

export const rooms = (model: SpatialModel): Room[] =>
  model.nodes.filter((node): node is Room => node.kind === "room");

export const setServiceState = (model: SpatialModel, id: NodeId, service: ServiceState): void => {
  getRoom(model, id).service = service;
};

const isBlocked = (model: SpatialModel, link: Link): boolean => {
  const node = model.nodes[link.to]!;
  return node.kind === "room" && node.service === "inaccessible";
};

/** Ids reachable from `start`, never entering an inaccessible room. */
export const reachableFrom = (model: SpatialModel, start: NodeId): Set<NodeId> => {
  const seen = new Set<NodeId>([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    for (const link of model.links[queue[head]!]!) {
      if (seen.has(link.to) || isBlocked(model, link)) continue;
      seen.add(link.to);
      queue.push(link.to);
    }
  }
  return seen;
};

/** Levels whose landing cannot be reached from the central stair root. */
export const unreachableLevels = (model: SpatialModel): number[] => {
  const seen = reachableFrom(model, stairRoot());
  const missing: number[] = [];
  for (const node of model.nodes) {
    if (node.kind === "landing" && !seen.has(node.id)) missing.push(node.level);
  }
  return missing;
};

/** Fastest route over existing passages (Dijkstra, ms); null when unreachable. */
export const findPath = (model: SpatialModel, from: NodeId, to: NodeId): Path | null => {
  const dist = new Map<NodeId, number>([[from, 0]]);
  const prev = new Map<NodeId, NodeId>();
  const heap: [number, NodeId][] = [[0, from]];

  const push = (item: [number, NodeId]): void => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (heap[parent]![0] <= heap[i]![0]) break;
      [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
      i = parent;
    }
  };
  const pop = (): [number, NodeId] => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length === 0) return top;
    heap[0] = last;
    for (let i = 0; ;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
      if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i]!, heap[m]!];
      i = m;
    }
    return top;
  };

  while (heap.length > 0) {
    const [d, id] = pop();
    if (d > (dist.get(id) ?? Infinity)) continue;
    if (id === to) {
      const nodes = [to];
      while (nodes[0] !== from) nodes.unshift(prev.get(nodes[0]!)!);
      return { nodes, ms: d };
    }
    for (const link of model.links[id]!) {
      if (isBlocked(model, link)) continue;
      const next = d + link.ms;
      if (next >= (dist.get(link.to) ?? Infinity)) continue;
      dist.set(link.to, next);
      prev.set(link.to, id);
      push([next, link.to]);
    }
  }
  return null;
};
