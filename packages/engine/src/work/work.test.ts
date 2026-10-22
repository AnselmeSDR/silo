import { describe, expect, it } from "vitest";
import { STEPS_PER_DAY } from "../core";
import { createPopulation, killInhabitant, moveInhabitant, setHealth } from "../population";
import { buildSpatialModel, rooms, setServiceState } from "../spatial";
import {
  PROFESSIONS,
  availableWorkforce,
  commuteOf,
  createAssignment,
  createWorkProfile,
  effectiveness,
  getProfession,
  isProductive,
  onDutyCount,
  phaseAt,
  planDay,
  relayShifts,
} from "./index";

const spatial = buildSpatialModel({
  levels: 24,
  arteriesPerLevel: 6,
  roomFunction: (_level, _artery, slot) => (slot === 0 ? "technical" : "housing"),
});
const population = createPopulation(spatial, { count: 300, seed: 1 });
const technical = rooms(spatial).find((r) => r.function === "technical");
const housing = rooms(spatial).find((r) => r.function === "housing");
if (!technical || !housing) throw new Error("fixture needs technical and housing rooms");

describe("catalog", () => {
  it("defines the 25 professions of concept §5.2.1 as data", () => {
    expect(PROFESSIONS).toHaveLength(25);
    expect(new Set(PROFESSIONS.map((p) => p.id)).size).toBe(25);
    for (const p of PROFESSIONS) {
      expect(p.tasks.length).toBeGreaterThan(0);
      expect(p.places.length).toBeGreaterThan(0);
      expect(p.skills.length).toBeGreaterThan(0);
      expect(p.shortage).not.toBe("");
    }
  });

  it("flags continuous services and rejects unknown ids", () => {
    expect(getProfession("nurse").continuous).toBe(true);
    expect(getProfession("archivist").continuous).toBe(false);
    expect(() => getProfession("nobody")).toThrow();
  });
});

describe("assignment", () => {
  const shift = { startMinute: 480, durationMin: 480 };

  it("links a person to a room, a profession and a shift", () => {
    const a = createAssignment(spatial, population, 0, "electrician", technical.id, shift);
    expect(a).toMatchObject({ inhabitantId: 0, professionId: "electrician", room: technical.id });
  });

  it("rejects a room whose function does not fit, an inaccessible room and a dead person", () => {
    expect(() => createAssignment(spatial, population, 0, "cook", technical.id, shift)).toThrow();
    const sealed = buildSpatialModel({
      levels: 1,
      arteriesPerLevel: 1,
      roomFunction: () => "technical",
    });
    const sealedRoom = rooms(sealed)[0];
    if (!sealedRoom) throw new Error("no room");
    setServiceState(sealed, sealedRoom.id, "inaccessible");
    expect(() =>
      createAssignment(sealed, population, 0, "electrician", sealedRoom.id, shift),
    ).toThrow(/inaccessible/);
    const pop = createPopulation(spatial, { count: 30, seed: 2 });
    killInhabitant(pop, 3, 0);
    expect(() => createAssignment(spatial, pop, 3, "electrician", technical.id, shift)).toThrow(
      /dead/,
    );
  });
});

describe("day", () => {
  it("chains commute, clock-in, prep, work, break, handover and return", () => {
    const plan = planDay({ startMinute: 480, durationMin: 480 }, 10);
    expect(plan.departureMinute).toBe(470);
    expect(plan.spans.map((s) => s.phase)).toEqual([
      "commute",
      "clockIn",
      "prep",
      "work",
      "break",
      "work",
      "handover",
      "return",
    ]);
    expect(phaseAt(plan, 470)).toBe("commute");
    expect(phaseAt(plan, 500)).toBe("work");
    expect(phaseAt(plan, 100)).toBe("off");
  });

  it("wraps over midnight", () => {
    const plan = planDay({ startMinute: 1400, durationMin: 120 }, 5);
    expect(phaseAt(plan, 1395)).toBe("commute");
    expect(phaseAt(plan, 30)).toBe("work");
  });

  it("rejects a shift too short to work", () => {
    expect(() => planDay({ startMinute: 0, durationMin: 25 }, 5)).toThrow();
  });
});

describe("workforce", () => {
  it("is smaller than the population: children, retirees, sick, training and absent are out", () => {
    const pop = createPopulation(spatial, { count: 300, seed: 4 });
    const profiles = new Map([[0, createWorkProfile({ inTraining: true })]]);
    const full = availableWorkforce(pop, new Map(), 0, 0);
    expect(full.available.length).toBeLessThan(full.population);
    expect(full.excluded.age).toBeGreaterThan(0);

    setHealth(pop, 1, "ill");
    killInhabitant(pop, 2, 0);
    profiles.set(5, createWorkProfile({ absentUntilStep: 100 }));
    const next = availableWorkforce(pop, profiles, 0, 0);
    expect(next.excluded.sick).toBe(1);
    expect(next.excluded.dead).toBe(1);
    expect(next.excluded.absent + next.excluded.age).toBeGreaterThanOrEqual(1);
    expect(next.available).not.toContain(1);
    expect(next.available).not.toContain(2);
    expect(next.available).not.toContain(5);
    // the absence ends
    expect(availableWorkforce(pop, profiles, 0, 100).excluded.absent).toBe(0);
  });
});

describe("productive presence", () => {
  const shift = { startMinute: 480, durationMin: 480 };
  const pop = createPopulation(spatial, { count: 30, seed: 6 });
  const assignment = createAssignment(spatial, pop, 0, "electrician", technical.id, shift);
  const commute = commuteOf(spatial, pop, assignment);
  const workMinute = 500;

  it("counts a worker at the post during the work phase", () => {
    expect(commute).not.toBeNull();
    moveInhabitant(pop, 0, technical.id);
    expect(isProductive(spatial, pop, createWorkProfile(), assignment, 0, workMinute)).toBe(true);
  });

  it("does not count an absence, a blocked trip, illness or the wrong phase", () => {
    moveInhabitant(pop, 0, technical.id);
    const absent = createWorkProfile({ absentUntilStep: 10 });
    expect(isProductive(spatial, pop, absent, assignment, 0, workMinute)).toBe(false);
    expect(isProductive(spatial, pop, absent, assignment, 10, workMinute)).toBe(true);
    expect(isProductive(spatial, pop, createWorkProfile(), assignment, 0, 100)).toBe(false);
    setHealth(pop, 0, "ill");
    expect(isProductive(spatial, pop, createWorkProfile(), assignment, 0, workMinute)).toBe(false);
    setHealth(pop, 0, "healthy");
    // blocked on the way: still at home during the work phase
    moveInhabitant(pop, 0, housing.id);
    expect(isProductive(spatial, pop, createWorkProfile(), assignment, 0, workMinute)).toBe(false);
  });

  it("separates assigned function, real skill and willingness", () => {
    const untrained = createWorkProfile();
    const skilled = createWorkProfile({ skills: { electricity: 80 }, willingness: 50 });
    expect(effectiveness(untrained, "electrician")).toBe(0);
    expect(effectiveness(skilled, "electrician")).toBeCloseTo(0.4);
    expect(
      effectiveness(
        createWorkProfile({ skills: { electricity: 80 }, willingness: 0 }),
        "electrician",
      ),
    ).toBe(0);
  });
});

describe("relay of continuous services", () => {
  it("covers the 24 h with three teams", () => {
    const pop = createPopulation(spatial, { count: 30, seed: 8 });
    const assignments = relayShifts(3).map((shift, i) =>
      createAssignment(spatial, pop, i, "waterTechnician", technical.id, shift),
    );
    for (let minute = 0; minute < STEPS_PER_DAY; minute++) {
      const count = onDutyCount(spatial, pop, assignments, "waterTechnician", technical.id, minute);
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it("leaves holes with a single day shift and rejects bad team counts", () => {
    const pop = createPopulation(spatial, { count: 30, seed: 8 });
    const day = createAssignment(spatial, pop, 0, "waterTechnician", technical.id, {
      startMinute: 480,
      durationMin: 480,
    });
    expect(onDutyCount(spatial, pop, [day], "waterTechnician", technical.id, 60)).toBe(0);
    expect(() => relayShifts(1)).toThrow();
    expect(() => relayShifts(7)).toThrow();
  });
});
