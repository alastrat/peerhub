// Where a respondent sat in the org when they submitted. Stored on
// SurveyResponse.segmentSnapshot so reorganizations don't rewrite results.

import {
  generationOf,
  isGender,
  tenureOf,
  GENERATIONS,
  TENURES,
  type GenderKey,
  type GenerationKey,
  type TenureKey,
} from "@/lib/constants/demographics";

export interface SegmentSnapshot {
  departmentId: string | null;
  hubId: string | null;
  teamIds: string[];
  /** Direct manager at submission — the "leader" segment. */
  leaderEmployeeId: string | null;
  gender: GenderKey | null;
  generation: GenerationKey | null;
  /** Tenure at the time of answering. */
  tenure: TenureKey | null;
}

interface SnapshotEmployee {
  departmentId: string | null;
  hubId: string | null;
  managerId: string | null;
  teamMemberships: { teamId: string }[];
  gender?: string | null;
  birthDate?: Date | null;
  startDate?: Date | null;
}

export type SegmentScope = "ORGANIZATION" | "DEPARTMENT" | "HUB" | "TEAM" | "LEADER";

export function buildSegmentSnapshot(employee: SnapshotEmployee, at: Date = new Date()): SegmentSnapshot {
  return {
    departmentId: employee.departmentId,
    hubId: employee.hubId,
    teamIds: employee.teamMemberships.map((m) => m.teamId),
    leaderEmployeeId: employee.managerId,
    gender: isGender(employee.gender) ? employee.gender : null,
    generation: generationOf(employee.birthDate),
    tenure: tenureOf(employee.startDate, at),
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Parse a stored snapshot; null when missing or malformed. */
export function parseSegmentSnapshot(json: unknown): SegmentSnapshot | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const generation = str(o.generation);
  const tenure = str(o.tenure);
  return {
    departmentId: str(o.departmentId),
    hubId: str(o.hubId),
    teamIds: Array.isArray(o.teamIds) ? o.teamIds.filter((t): t is string => typeof t === "string") : [],
    leaderEmployeeId: str(o.leaderEmployeeId),
    gender: isGender(o.gender) ? o.gender : null,
    generation: generation && (GENERATIONS as readonly string[]).includes(generation) ? (generation as GenerationKey) : null,
    tenure: tenure && (TENURES as readonly string[]).includes(tenure) ? (tenure as TenureKey) : null,
  };
}

/**
 * The snapshot when there is one, else the employee's current position
 * (responses submitted before snapshots existed).
 */
export function resolveSegments(snapshot: unknown, employee: SnapshotEmployee | null): SegmentSnapshot {
  const parsed = parseSegmentSnapshot(snapshot);
  if (parsed) return parsed;
  if (employee) return buildSegmentSnapshot(employee);
  return {
    departmentId: null,
    hubId: null,
    teamIds: [],
    leaderEmployeeId: null,
    gender: null,
    generation: null,
    tenure: null,
  };
}

/** Does a response with these segments belong to the given scope? */
export function inScope(segments: SegmentSnapshot, scope: SegmentScope, scopeRefId: string | null): boolean {
  switch (scope) {
    case "ORGANIZATION":
      return true;
    case "DEPARTMENT":
      return scopeRefId != null && segments.departmentId === scopeRefId;
    case "HUB":
      return scopeRefId != null && segments.hubId === scopeRefId;
    case "TEAM":
      return scopeRefId != null && segments.teamIds.includes(scopeRefId);
    case "LEADER":
      return scopeRefId != null && segments.leaderEmployeeId === scopeRefId;
  }
}
