import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROOM_CAPACITY,
  buildSpatialModel,
  findPath,
  getRoom,
  reachableFrom,
  rooms,
  setServiceState,
  stairRoot,
  unreachableLevels,
} from "./index";

const target = buildSpatialModel({ levels: 24, arteriesPerLevel: 4 });
const prototype = buildSpatialModel({ levels: 12, arteriesPerLevel: 2 });

const landing = (level: number): number =>
  target.nodes.findIndex((n) => n.kind === "landing" && n.level === level);

describe("rooms", () => {
  it("have function, capacity, access and service state", () => {
    expect(rooms(prototype)[0]).toMatchObject({
      function: "housing",
      capacity: 2,
      access: "open",
      service: "available",
    });
  });

  it("take their capacity from the scenario, with a default", () => {
    const custom = buildSpatialModel({
      levels: 1,
      arteriesPerLevel: 1,
      roomCapacity: (_level, _artery, slot) => slot + 1,
    });
    expect(rooms(custom).map((r) => r.capacity)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(rooms(prototype).map((r) => r.capacity))).toEqual(
      new Set([DEFAULT_ROOM_CAPACITY]),
    );
  });

  it("match D-08 counts: 40 per level at target, 960 in total", () => {
    expect(rooms(target)).toHaveLength(960);
    expect(rooms(prototype)).toHaveLength(12 * 2 * 10);
  });

  it("take their function from the scenario", () => {
    const model = buildSpatialModel({
      levels: 2,
      arteriesPerLevel: 2,
      roomFunction: (level) => (level === 0 ? "canteen" : "workshop"),
    });
    expect(new Set(rooms(model).map((r) => r.function))).toEqual(new Set(["canteen", "workshop"]));
  });
});

describe("graph", () => {
  it("makes every level reachable from the central stair", () => {
    expect(unreachableLevels(target)).toEqual([]);
    expect(reachableFrom(target, stairRoot()).size).toBe(target.nodes.length);
  });

  it("links stair, walkways, gallery, arteries and doors", () => {
    expect(new Set(target.edges.map((e) => e.kind))).toEqual(
      new Set(["stair", "walkway", "gallery", "artery", "door"]),
    );
  });

  it("matches D-08 stair times: ~22 s up, ~17 s down per level", () => {
    expect(findPath(target, landing(0), landing(1))!.ms).toBe(22_143);
    expect(findPath(target, landing(1), landing(0))!.ms).toBe(17_222);
  });

  it("matches D-08 artery: 30 m and ~23 s from the wall to the end", () => {
    const junction = target.nodes.find(
      (n) => n.kind === "junction" && n.level === 0 && n.angleDeg === 0,
    )!;
    const end = target.nodes.find(
      (n) => n.kind === "artery" && n.level === 0 && n.artery === 0 && n.index === 5,
    )!;
    const path = findPath(target, junction.id, end.id)!;
    const lengthCm = path.nodes
      .slice(1)
      .reduce(
        (sum, id, i) =>
          sum +
          target.edges[target.links[path.nodes[i]!]!.find((l) => l.to === id)!.edge]!.lengthCm,
        0,
      );
    expect(lengthCm).toBe(3000);
    // 30 m at 1.3 m/s, each edge rounded to the ms.
    expect(Math.abs(path.ms - 23_077)).toBeLessThanOrEqual(5);
  });

  it("attaches the first rooms 3 m from the wall", () => {
    const first = target.nodes.find(
      (n) => n.kind === "artery" && n.level === 0 && n.artery === 0 && n.index === 0,
    )!;
    const edge = target.edges.find((e) => e.kind === "artery" && e.to === first.id)!;
    expect(edge.lengthCm).toBe(300);
    expect(target.links[first.id]!.filter((l) => target.nodes[l.to]!.kind === "room")).toHaveLength(
      2,
    );
  });

  it("routes between two arteries through the gallery only", () => {
    const from = rooms(target).find((r) => r.level === 0 && r.artery === 0)!;
    const to = rooms(target).find((r) => r.level === 0 && r.artery === 1)!;
    const kinds = findPath(target, from.id, to.id)!.nodes.map((id) => target.nodes[id]!.kind);
    expect(kinds).toContain("junction");
    expect(kinds).not.toContain("landing");
  });

  it("is deterministic", () => {
    expect(buildSpatialModel({ levels: 4, arteriesPerLevel: 4 })).toEqual(
      buildSpatialModel({ levels: 4, arteriesPerLevel: 4 }),
    );
  });
});

describe("inaccessible rooms", () => {
  it("cannot be reached", () => {
    const model = buildSpatialModel({ levels: 3, arteriesPerLevel: 2 });
    const room = rooms(model)[0]!;
    setServiceState(model, room.id, "inaccessible");
    expect(getRoom(model, room.id).service).toBe("inaccessible");
    expect(findPath(model, stairRoot(), room.id)).toBeNull();
  });
});
