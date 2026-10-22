/* global URL, console */
// THROWAWAY prototype (SIL-12): D-03 protocol for the render side.
// 3 runs each of: render only, render + shadows, engine + render + shadows.
import { spawnSync } from "node:child_process";

const configs = [
  ["render", "0"],
  ["render", "1"],
  ["both", "1"],
];
const results = [];
for (const [mode, shadows] of configs) {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const out = spawnSync(
      "node",
      [new URL("renderBench.mjs", import.meta.url).pathname, mode, shadows, "5", "60"],
      { encoding: "utf8" },
    );
    const line = out.stdout.trim().split("\n").pop() ?? "";
    try {
      runs.push(JSON.parse(line));
    } catch {
      console.error(`run failed: ${mode} shadows=${shadows}`, out.stderr.slice(0, 300));
    }
  }
  const sorted = [...runs].sort((a, b) => a.frame.p95 - b.frame.p95);
  results.push({ mode, shadows, runs: runs.length, median: sorted[Math.floor(sorted.length / 2)] });
}
console.log(JSON.stringify(results));
