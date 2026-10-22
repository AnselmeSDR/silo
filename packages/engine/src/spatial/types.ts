export type NodeId = number;

export type EdgeKind = "stair" | "walkway" | "gallery" | "artery" | "door";

/** Room functions; the scenario may assign any of them (concept §3.5). */
export type RoomFunction =
  "housing" | "workshop" | "canteen" | "storage" | "infirmary" | "technical" | "school";

export type RoomAccess = "open" | "restricted" | "locked";

/** Service states of concept §3.5. */
export type ServiceState = "available" | "degraded" | "stopped" | "inaccessible" | "occupied";

export interface BaseNode {
  id: NodeId;
  level: number;
  /** Angle around the shaft axis, in degrees [0, 360). */
  angleDeg: number;
}

/** Stair landing (palier) of a level, on the central stair. */
export interface LandingNode extends BaseNode {
  kind: "landing";
}

/** Point of the annular gallery (coursive) where a walkway or an artery attaches. */
export interface JunctionNode extends BaseNode {
  kind: "junction";
}

/** Point along an artery; `index` 0 is the first module (3 m from the wall), the last is the end (30 m). */
export interface ArteryNode extends BaseNode {
  kind: "artery";
  artery: number;
  index: number;
}

export interface Room extends BaseNode {
  kind: "room";
  artery: number;
  function: RoomFunction;
  /** Number of occupants the room can host. */
  capacity: number;
  /** Usable floor area, in m². */
  areaM2: number;
  access: RoomAccess;
  service: ServiceState;
}

export type SpatialNode = LandingNode | JunctionNode | ArteryNode | Room;

export interface Edge {
  kind: EdgeKind;
  from: NodeId;
  to: NodeId;
  lengthCm: number;
  /** Travel time from `from` to `to`, in ms. */
  msForward: number;
  /** Travel time from `to` to `from`, in ms. */
  msBackward: number;
}

/** A half-edge as seen from one of its ends. */
export interface Link {
  to: NodeId;
  edge: number;
  ms: number;
}

export interface SpatialModel {
  levels: number;
  arteriesPerLevel: number;
  nodes: SpatialNode[];
  edges: Edge[];
  /** Derived from `edges`; indexed by node id. */
  links: Link[][];
}

export interface BuildOptions {
  /** Number of levels (D-08: prototype 12, target 24). */
  levels: number;
  /** Arteries per level, evenly spaced (D-08: prototype 2, target 4). */
  arteriesPerLevel: number;
  /** Picks the function of a room; defaults to housing. */
  roomFunction?: (level: number, artery: number, slot: number) => RoomFunction;
}

export interface Path {
  nodes: NodeId[];
  ms: number;
}
