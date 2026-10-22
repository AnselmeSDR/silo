import type { MovementWorld } from "../movement";
import type { Needs } from "../needs";
import type { Population } from "../population";
import type { NodeId } from "../spatial";
import type { StocksWorld } from "../stocks";
import type { Assignment, DayPlan, WorkProfile } from "../work";

/** What an inhabitant can try to do (concept §5.4); more kinds come with later tickets. */
export type ActionKind = "drink" | "eat" | "sleep" | "work" | "idle";

/** Why an attempt did not succeed: an intention is not a success (concept §5.4). */
export type FailureCause = "no-resource" | "unreachable" | "incapacitated" | "absent";

/** `progress`: on the way, the effect has not happened yet. */
export type AttemptResult = "success" | "progress" | "failed";

export interface Attempt {
  step: number;
  action: ActionKind;
  /** Place the action aims at (stock, home, post); null for idle. */
  target: NodeId | null;
  result: AttemptResult;
  cause: FailureCause | null;
}

/** An action considered at a step, with the score that ranks it. */
export interface Candidate {
  action: ActionKind;
  target: NodeId | null;
  score: number;
}

export interface FailureEntry {
  inhabitant: number;
  step: number;
  action: ActionKind;
  cause: FailureCause;
}

export interface Decisions {
  /** Last attempt by inhabitant id (empty until the first decision). */
  last: (Attempt | undefined)[];
  /** Failures, logged when an inhabitant's (action, cause) changes; oldest dropped past `MAX_FAILURE_LOG`. */
  failures: FailureEntry[];
  /** Failure count by cause since the start, never truncated. */
  failureCounts: Record<FailureCause, number>;
  /** Engagements: the post and shift an inhabitant committed to. */
  commitments: Map<number, Assignment>;
  /** Day plans by inhabitant, valid for one spatial revision. */
  plans: Map<number, { revision: number; plan: DayPlan | null }>;
}

export interface DecisionWorld extends StocksWorld, MovementWorld {
  population: Population;
  needs: Needs;
  profiles?: Map<number, WorkProfile>;
  decisions: Decisions;
}
