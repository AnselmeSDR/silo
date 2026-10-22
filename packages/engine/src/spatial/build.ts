import type {
  BuildOptions,
  Edge,
  EdgeKind,
  Link,
  NodeId,
  Room,
  RoomFunction,
  SpatialModel,
  SpatialNode,
} from "./types";

// Reference dimensions and speeds from D-08, in cm and mm/s.
const STAIR_LEVEL_CM = 1550;
const WALKWAY_CM = 650;
const GALLERY_RADIUS_CM = 1525;
const ARTERY_HALF_MODULE_CM = 300;
const ARTERY_MODULE_CM = 600;
const DOOR_CM = 300;
const MODULES_PER_ARTERY = 5;
const ROOM_AREA_M2 = 29;
const FLAT_MM_S = 1300;
const STAIR_UP_MM_S = 700;
const STAIR_DOWN_MM_S = 900;

const msFor = (lengthCm: number, mmPerSecond: number): number =>
  Math.round((lengthCm * 10 * 1000) / mmPerSecond);

const defaultFunction = (): RoomFunction => "housing";

export const buildSpatialModel = (options: BuildOptions): SpatialModel => {
  const { levels, arteriesPerLevel } = options;
  if (!Number.isInteger(levels) || levels < 1) throw new Error("levels must be >= 1");
  if (!Number.isInteger(arteriesPerLevel) || arteriesPerLevel < 1) {
    throw new Error("arteriesPerLevel must be >= 1");
  }
  const roomFunction = options.roomFunction ?? defaultFunction;

  const nodes: SpatialNode[] = [];
  const edges: Edge[] = [];

  const addEdge = (
    kind: EdgeKind,
    from: NodeId,
    to: NodeId,
    lengthCm: number,
    msForward = msFor(lengthCm, FLAT_MM_S),
    msBackward = msForward,
  ): void => {
    edges.push({ kind, from, to, lengthCm, msForward, msBackward });
  };

  const landings: NodeId[] = [];
  for (let level = 0; level < levels; level++) {
    // The walkway alternates 0° / 180° with the half-turn of the stair.
    const walkwayAngle = level % 2 === 0 ? 0 : 180;
    const landing = nodes.length;
    nodes.push({ id: landing, kind: "landing", level, angleDeg: walkwayAngle });
    landings.push(landing);
    if (level > 0) {
      addEdge(
        "stair",
        landings[level - 1]!,
        landing,
        STAIR_LEVEL_CM,
        msFor(STAIR_LEVEL_CM, STAIR_UP_MM_S),
        msFor(STAIR_LEVEL_CM, STAIR_DOWN_MM_S),
      );
    }

    // Gallery junctions: every artery angle, plus the walkway angle if it is not one.
    const arteryAngles = Array.from(
      { length: arteriesPerLevel },
      (_, a) => (360 * a) / arteriesPerLevel,
    );
    const angles = [...new Set([...arteryAngles, walkwayAngle])].sort((x, y) => x - y);
    const junctionAt = new Map<number, NodeId>();
    for (const angleDeg of angles) {
      const id = nodes.length;
      nodes.push({ id, kind: "junction", level, angleDeg });
      junctionAt.set(angleDeg, id);
    }
    addEdge("walkway", landing, junctionAt.get(walkwayAngle)!, WALKWAY_CM);
    if (angles.length > 1) {
      angles.forEach((angleDeg, i) => {
        const nextAngle = angles[(i + 1) % angles.length]!;
        const span = (nextAngle - angleDeg + 360) % 360 || 360;
        const arcCm = Math.round(GALLERY_RADIUS_CM * ((span * Math.PI) / 180));
        addEdge("gallery", junctionAt.get(angleDeg)!, junctionAt.get(nextAngle)!, arcCm);
      });
    }

    arteryAngles.forEach((angleDeg, artery) => {
      let previous = junctionAt.get(angleDeg)!;
      // One node per module centre (3 m, then +6 m up to 27 m) serving a room on each side,
      // then the end of the artery at 30 m.
      for (let index = 0; index <= MODULES_PER_ARTERY; index++) {
        const id = nodes.length;
        nodes.push({ id, kind: "artery", level, angleDeg, artery, index });
        const isEnd = index === MODULES_PER_ARTERY;
        addEdge(
          "artery",
          previous,
          id,
          index === 0 || isEnd ? ARTERY_HALF_MODULE_CM : ARTERY_MODULE_CM,
        );
        previous = id;
        if (isEnd) break;
        for (let side = 0; side < 2; side++) {
          const room: Room = {
            id: nodes.length,
            kind: "room",
            level,
            angleDeg,
            artery,
            function: roomFunction(level, artery, index * 2 + side),
            capacity: options.roomCapacity(level, artery, index * 2 + side),
            areaM2: ROOM_AREA_M2,
            access: "open",
            service: "available",
          };
          nodes.push(room);
          addEdge("door", id, room.id, DOOR_CM);
        }
      }
    });
  }

  const links: Link[][] = nodes.map(() => []);
  edges.forEach((edge, i) => {
    links[edge.from]!.push({ to: edge.to, edge: i, ms: edge.msForward });
    links[edge.to]!.push({ to: edge.from, edge: i, ms: edge.msBackward });
  });

  return { levels, arteriesPerLevel, nodes, edges, links, revision: 0 };
};
