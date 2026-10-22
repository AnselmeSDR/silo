import { describe, expect, it } from "vitest";
import { createObserver } from "../observation";
import { starterSilo } from "../scenario";
import { createScenarioSimulation } from "../world";
import { runHeadless } from "./run";

describe("headless run", () => {
  it("produces a final summary after N days", () => {
    const s = runHeadless(starterSilo, 2);
    expect(s.time.day).toBe(2);
    expect(s.population.total).toBe(2000);
    expect(s.population.alive).toBe(2000);
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
