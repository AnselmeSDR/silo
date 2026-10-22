// THROWAWAY prototype (SIL-12): headless engine measure, D-03 method.
// Usage: node dist/bench.js [warmupSeconds] [measureSeconds] [runs]
import { World, entityCount, stats, type Stats } from "./sim";

const warmup = Number(process.argv[2] ?? 5) * 1000;
const duration = Number(process.argv[3] ?? 60) * 1000;
const runs = Number(process.argv[4] ?? 3);

function run(): Stats {
  const world = new World(42);
  const samples: number[] = [];
  const start = performance.now();
  for (;;) {
    const t0 = performance.now();
    world.step();
    const t1 = performance.now();
    const elapsed = t1 - start;
    if (elapsed >= warmup) samples.push(t1 - t0);
    if (elapsed >= warmup + duration) break;
  }
  return stats(samples);
}

const all = Array.from({ length: runs }, run);
const median = [...all].sort((a, b) => a.p95 - b.p95)[Math.floor(runs / 2)]!;
const target = 10;
console.log(
  JSON.stringify({
    kind: "engine-headless",
    entities: entityCount,
    node: process.version,
    unit: "ms/step",
    runs: all,
    median,
    pass: median.p95 <= target,
  }),
);
process.exitCode = median.p95 <= target ? 0 : 1;
