import { timeOfStep, type System } from "../core";
import { cancelTrip, destinationOf, requestTrip } from "../movement";
import { SEEK_THRESHOLD, needsOf } from "../needs";
import { isAlive } from "../population";
import { freeOf } from "../stocks";
import { commuteOf, createWorkProfile, isAbsent, phaseAt, planDay, type Assignment } from "../work";
import type { Attempt, Candidate, DecisionWorld, Decisions, FailureCause } from "./types";

export const MAX_FAILURE_LOG = 1_000;
/** A need below its threshold always outranks an engagement: its base score is above `WORK_SCORE`. */
const NEED_BASE_SCORE = 10_000;
const WORK_SCORE = 5_000;

export const createDecisions = (): Decisions => ({
  last: [],
  failures: [],
  failureCounts: { "no-resource": 0, unreachable: 0, incapacitated: 0, absent: 0 },
  commitments: new Map(),
  plans: new Map(),
});

/** Commits an inhabitant to a post and shift; replaces any previous engagement. */
export const commit = (decisions: Decisions, assignment: Assignment): void => {
  decisions.commitments.set(assignment.inhabitantId, assignment);
  decisions.plans.delete(assignment.inhabitantId);
};

const dayPlanOf = (world: DecisionWorld, assignment: Assignment) => {
  const cached = world.decisions.plans.get(assignment.inhabitantId);
  if (cached && cached.revision === world.spatial.revision) return cached.plan;
  const commute = commuteOf(world.spatial, world.population, assignment);
  // Unreachable post: still planned (no commute), so the attempt fails with a recorded cause.
  const plan = planDay(assignment.shift, commute ?? 0);
  world.decisions.plans.set(assignment.inhabitantId, { revision: world.spatial.revision, plan });
  return plan;
};

/** Node of the first stock of `kind` with something free (same rule as the needs system). */
const supplyNode = (world: DecisionWorld, kind: "water" | "food"): number | null => {
  return world.stocks.stocks.find((s) => s.kind === kind && freeOf(s) > 0)?.node ?? null;
};

/** Steps 2-3: urgent needs and engagements, scored; the highest score comes first. */
export const evaluate = (world: DecisionWorld, id: number, minuteOfDay: number): Candidate[] => {
  const state = needsOf(world.needs, id);
  const { gauges } = state;
  const inhabitant = world.population.inhabitants[id]!;
  const candidates: Candidate[] = [];

  for (const [action, kind] of [
    ["drink", "water"],
    ["eat", "food"],
  ] as const) {
    if (gauges[kind] > SEEK_THRESHOLD) continue;
    // A stock where the inhabitant stands is used by the needs system; otherwise go to one.
    const here = world.stocks.stocks.some(
      (s) => s.kind === kind && s.node === inhabitant.position && freeOf(s) > 0,
    );
    candidates.push({
      action,
      target: here ? inhabitant.position : supplyNode(world, kind),
      score: NEED_BASE_SCORE + SEEK_THRESHOLD - gauges[kind],
    });
  }
  if (state.seeking === "sleep") {
    candidates.push({
      action: "sleep",
      target: inhabitant.residence,
      score: NEED_BASE_SCORE + SEEK_THRESHOLD - gauges.sleep,
    });
  }

  const assignment = world.decisions.commitments.get(id);
  const plan = assignment ? dayPlanOf(world, assignment) : null;
  if (assignment && plan) {
    const phase = phaseAt(plan, minuteOfDay);
    if (phase !== "off" && phase !== "return") {
      const willingness = (world.profiles?.get(id) ?? createWorkProfile()).willingness;
      candidates.push({
        action: "work",
        target: assignment.room,
        score: (WORK_SCORE * willingness) / 100,
      });
    }
  }
  candidates.push({ action: "idle", target: null, score: 0 });
  // Stable sort: equal scores keep the order above, so the choice stays deterministic.
  return candidates.sort((a, b) => b.score - a.score);
};

/** Heads for `target`: "success" when already there, "progress" when travelling, else "blocked". */
const goTo = (world: DecisionWorld, id: number, target: number): Attempt["result"] | "blocked" => {
  if (world.population.inhabitants[id]!.position === target) return "success";
  const current = destinationOf(world.movement, id);
  if (current === target) return "progress";
  // Heading elsewhere: the chosen action wins, so the old trip is replaced (back off if unreachable).
  if (current !== null) cancelTrip(world.movement, id);
  return requestTrip(world, id, target) ? "progress" : "blocked";
};

/** Step 4: tries the action for real; resources, access and health decide, not the wish. */
const attempt = (world: DecisionWorld, id: number, chosen: Candidate, step: number): Attempt => {
  const { action, target } = chosen;
  const base = { step, action, target };
  const fail = (cause: FailureCause): Attempt => ({ ...base, result: "failed", cause });
  if (target === null)
    return action === "idle" ? { ...base, result: "success", cause: null } : fail("no-resource");

  if (action === "work") {
    const profile = world.profiles?.get(id) ?? createWorkProfile();
    if (isAbsent(profile, step)) return fail("absent");
    if (needsOf(world.needs, id).incapacitated) return fail("incapacitated");
  }
  const result = goTo(world, id, target);
  return result === "blocked" ? fail("unreachable") : { ...base, result, cause: null };
};

/** Step 5: keeps the last attempt, and logs a failure each time its (action, cause) changes. */
const record = (decisions: Decisions, id: number, next: Attempt): void => {
  const previous = decisions.last[id];
  decisions.last[id] = next;
  if (next.cause === null) return;
  if (previous?.action === next.action && previous.cause === next.cause) return;
  decisions.failureCounts[next.cause]++;
  decisions.failures.push({
    inhabitant: id,
    step: next.step,
    action: next.action,
    cause: next.cause,
  });
  if (decisions.failures.length > MAX_FAILURE_LOG) decisions.failures.shift();
};

/**
 * Decision loop (concept §5.4): needs and engagements → scored candidates → best action →
 * real attempt → recorded outcome. Run after `needsSystem`, before `movementSystem`; it owns
 * the trips the needs system would otherwise start (see `NeedsWorld.decisions`).
 */
export const decisionSystem: System<DecisionWorld> = {
  name: "decision",
  update(world, ctx) {
    const { minuteOfDay } = timeOfStep(ctx.step);
    const living = world.population.inhabitants.filter(isAlive).map((i) => i.id);
    for (const id of ctx.shuffle(living)) {
      const [best] = evaluate(world, id, minuteOfDay);
      record(world.decisions, id, attempt(world, id, best!, ctx.step));
    }
  },
};
