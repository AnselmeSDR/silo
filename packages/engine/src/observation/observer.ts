import { isAlive, type HealthStatus } from "../population";
import type { Simulation } from "../core";
import type { World } from "../world";
import type { InhabitantView, Observer, Summary } from "./types";

export const createObserver = (sim: Simulation<World>): Observer => {
  const { population, movement } = sim.state;

  const view = (id: number): InhabitantView | undefined => {
    const inhabitant = population.inhabitants[id];
    if (!inhabitant) return undefined;
    return {
      id,
      health: inhabitant.health,
      position: inhabitant.position,
      travelling: id in movement.trips,
    };
  };

  return {
    get time() {
      return sim.time;
    },
    get speed() {
      return sim.speed;
    },
    inhabitants: () => population.inhabitants.map((i) => view(i.id) as InhabitantView),
    inhabitant: view,
    summary(): Summary {
      const byHealth: Record<HealthStatus, number> = { healthy: 0, ill: 0, injured: 0, dead: 0 };
      let alive = 0;
      for (const inhabitant of population.inhabitants) {
        byHealth[inhabitant.health]++;
        if (isAlive(inhabitant)) alive++;
      }
      return {
        time: sim.time,
        population: {
          total: population.inhabitants.length,
          alive,
          dead: population.inhabitants.length - alive,
          travelling: Object.keys(movement.trips).length,
          byHealth,
        },
        movement: { ...movement.stats },
        stocks: { ...sim.state.stocks },
      };
    },
  };
};
