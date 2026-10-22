import type { Observer } from "@silo/engine";

// The renderer reads the simulation only through an Observer (concept §15.1-15.2).
export const readFrame = (observer: Observer) => ({
  time: observer.time,
  inhabitants: observer.inhabitants(),
});
