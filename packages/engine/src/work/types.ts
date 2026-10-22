import type { SectorType } from "../scenario";
import type { NodeId } from "../spatial";

export type ProfessionId = string;
export type SkillId = string;

/** A profession is a set of tasks and skills, not an automatic output (concept §5.2.1). */
export interface Profession {
  id: ProfessionId;
  label: string;
  tasks: readonly string[];
  /** Sector types (SIL-16 catalog) where the profession works. */
  sectors: readonly SectorType[];
  /** Skills the profession requires. */
  skills: readonly SkillId[];
  /** Effect of a staff shortage, as text for the interface. */
  shortage: string;
  /** Continuous service: needs relaying teams (concept §5.2.2). */
  continuous: boolean;
}

/**
 * Three distinct notions (concept §5.2): the assigned function (`Assignment`), the real skill
 * and the willingness to work. An assignment guarantees neither qualification nor obedience.
 */
export interface WorkProfile {
  /** Real skill levels, 0-100; a missing skill is 0. */
  skills: Record<SkillId, number>;
  /** Willingness to work, 0-100. */
  willingness: number;
  /** Still in training: not part of the available workforce. */
  inTraining: boolean;
  /** Absent (leave, strike, ...) until this step excluded; null when present. */
  absentUntilStep: number | null;
}

export interface Shift {
  /** Minute of the day when clock-in starts. */
  startMinute: number;
  /** Duration from clock-in to the end of the handover, in minutes. */
  durationMin: number;
}

export interface Assignment {
  inhabitantId: number;
  professionId: ProfessionId;
  room: NodeId;
  shift: Shift;
}

export type DayPhase =
  "commute" | "clockIn" | "prep" | "work" | "break" | "handover" | "return" | "off";

export interface PhaseSpan {
  phase: Exclude<DayPhase, "off">;
  /** Minutes since departure. */
  from: number;
  to: number;
}

export interface DayPlan {
  /** Minute of the day of departure from home. */
  departureMinute: number;
  spans: readonly PhaseSpan[];
}
