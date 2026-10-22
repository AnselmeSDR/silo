import { describe, expect, it } from "vitest";
import { createObserver } from "../observation";
import { starterSilo } from "../scenario";
import { createScenarioSimulation } from "../world";
import { formatSummary, runHeadless } from "./run";

describe("headless run", () => {
  it("produces a final summary after N days", () => {
    const s = runHeadless(starterSilo, 2);
    expect(s.time.day).toBe(2);
    expect(s.population.total).toBe(2000);
    expect(s.population.alive).toBe(2000);
  });

  it("shows water, food and energy produced by the staffed lines", () => {
    const s = runHeadless(starterSilo, 2);
    const { produced, consumed } = s.production;
    expect(produced.water).toBeGreaterThan(0);
    expect(produced.food).toBeGreaterThan(0);
    expect(produced.energy).toBeGreaterThan(0);
    expect(consumed.energy).toBeGreaterThan(0);
    expect(s.production.machines).toHaveLength(3);
    expect(s.stocks.waterMl).toBe(starterSilo.stocks.waterMl + produced.water! - consumed.water!);
    expect(formatSummary("starter", s)).toContain("produced:");
  });

  it("produces nothing when the scenario has no production line", () => {
    const s = runHeadless({ ...starterSilo, production: [] }, 1);
    expect(s.production.produced.water).toBe(0);
    expect(s.stocks.waterMl).toBe(starterSilo.stocks.waterMl);
  });

  it("is deterministic", () => {
    expect(runHeadless(starterSilo, 1)).toEqual(runHeadless(starterSilo, 1));
  });
});

describe("observer", () => {
  it("exposes copies, not the engine state", () => {
    const observer = createObserver(createScenarioSimulation(starterSilo));
    const view = observer.inhabitant(0) as { health: string };
    view.health = "dead";
    expect(observer.inhabitant(0)?.health).toBe("healthy");
    expect(observer.inhabitants()).toHaveLength(2000);
    expect(observer.inhabitant(5000)).toBeUndefined();
  });
});
