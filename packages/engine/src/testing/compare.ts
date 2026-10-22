const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Returns the paths where two states differ (empty when equal). */
export const diffStates = (a: unknown, b: unknown, path = ""): string[] => {
  if (Object.is(a, b)) return [];
  if (!isObject(a) || !isObject(b) || Array.isArray(a) !== Array.isArray(b)) {
    return [path || "."];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((key) => diffStates(a[key], b[key], path ? `${path}.${key}` : key));
};

export const statesEqual = (a: unknown, b: unknown): boolean => diffStates(a, b).length === 0;
