import { describe, expect, it } from "vitest";
import {
  SECTOR_CATALOG,
  SECTOR_TYPES,
  ScenarioError,
  loadScenario,
  starterSilo,
  validateScenario,
} from "./index";

// Loosely typed on purpose: the tests corrupt the scenario.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Scenario = any;

const clone = (): Scenario => JSON.parse(JSON.stringify(starterSilo));

describe("loadScenario", () => {
  it("loads a valid file", () => {
    expect(loadScenario(JSON.stringify(starterSilo))).toEqual(starterSilo);
  });

  it.each<[string, (s: Scenario) => void, string]>([
    ["unknown sector", (s) => (s.sectors[0].sector = "casino"), "unknown"],
    ["level out of range", (s) => (s.sectors[0].levels = [99]), "within 0..23"],
    ["overlapping assignment", (s) => s.sectors.push({ ...s.sectors[0] }), "already assigned"],
    [
      "shares not summing to 100",
      (s) => (s.population.ageClasses[0].sharePercent = 5),
      "sum to 100",
    ],
    ["fractional stock", (s) => (s.stocks.waterMl = 1.5), "stocks.waterMl"],
    ["too little housing", (s) => (s.population.total = 99999), "below the population"],
    ["wrong version", (s) => (s.version = 2), "version"],
  ])("rejects %s", (_, mutate, message) => {
    const scenario = clone();
    mutate(scenario);
    expect(() => loadScenario(JSON.stringify(scenario))).toThrow(ScenarioError);
    expect(validateScenario(scenario).join("\n")).toContain(message);
  });

  it("rejects non-JSON and non-objects", () => {
    expect(() => loadScenario("{")).toThrow(ScenarioError);
    expect(validateScenario([])).toHaveLength(1);
  });
});

describe("sector catalog", () => {
  it("defines the 17 types of concept §3.4 once each", () => {
    expect(SECTOR_TYPES).toHaveLength(17);
    expect(SECTOR_CATALOG.map((s) => s.type)).toEqual([...SECTOR_TYPES]);
  });

  it("describes rooms, activities and dependencies for each type", () => {
    for (const s of SECTOR_CATALOG) {
      expect(s.rooms.length).toBeGreaterThan(0);
      expect(s.activities.length).toBeGreaterThan(0);
      expect(s.dependencies.length).toBeGreaterThan(0);
    }
  });
});

describe("starterSilo", () => {
  it("is valid and uses the D-08 target topology and D-06 population", () => {
    expect(validateScenario(starterSilo)).toEqual([]);
    expect(starterSilo.population.total).toBe(2000);
    expect(starterSilo.topology).toEqual({ levels: 24, arteriesPerLevel: 4 });
  });

  it("assigns every level and artery exactly once", () => {
    const cells = starterSilo.sectors.reduce(
      (n, a) => n + a.levels.length * (a.arteries?.length ?? 4),
      0,
    );
    expect(cells).toBe(24 * 4);
  });
});
