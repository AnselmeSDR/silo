import { readFileSync } from "node:fs";
import { formatSummary, runHeadless } from "./headless";
import { loadScenario, starterSilo } from "./scenario";

// Headless entry point: no DOM, no rendering. Usage: cli [scenario.json] [--days N]
const args = process.argv.slice(2);
const daysAt = args.indexOf("--days");
const days = daysAt === -1 ? 1 : Number(args[daysAt + 1]);
const file = args.find((a, i) => !a.startsWith("--") && i !== daysAt + 1);

const config = file ? loadScenario(readFileSync(file, "utf8")) : starterSilo;
console.log(formatSummary(config.name, runHeadless(config, days)));
