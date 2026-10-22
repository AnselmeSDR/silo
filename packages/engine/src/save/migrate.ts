import { FORMAT_VERSION, SaveError } from "./types";

/** `MIGRATIONS[n]` turns a version n file into a version n+1 one: pure, explicit, never implicit (D-04). */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

/** Brings a parsed file to the current format, or refuses it with a clear message. */
export const migrate = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SaveError(["save must be a JSON object"]);
  }
  let data = value as Record<string, unknown>;
  const version = data.formatVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new SaveError(["formatVersion is missing or not a positive integer: not a Silo save"]);
  }
  if (version > FORMAT_VERSION) {
    throw new SaveError([
      `save format ${version} is newer than this engine (reads up to ${FORMAT_VERSION}): update the game`,
    ]);
  }
  for (let v = version; v < FORMAT_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError([`no migration from save format ${v} to ${v + 1}`]);
    data = { ...step(data), formatVersion: v + 1 };
  }
  return data;
};
