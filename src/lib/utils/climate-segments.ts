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
 * (responses submitted before snapshots existed), with tenure measured at
 * `submittedAt` so old results don't drift as time passes.
 */
export function resolveSegments(
  snapshot: unknown,
  employee: SnapshotEmployee | null,
  submittedAt?: Date | null,
): SegmentSnapshot {
  const parsed = parseSegmentSnapshot(snapshot);
  if (parsed) return parsed;
  if (employee) return buildSegmentSnapshot(employee, submittedAt ?? undefined);
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

/**
 * Where an invited person counts for participation. Leader, gender,
 * generation and tenure each come from their snapshot when it holds one, else
 * from their current data: people who haven't answered, and people who
 * answered before their manager or demographics were loaded, so they aren't
 * stuck under "no leader" / "not set". Tenure from current data is measured
 * at `at`. The rest is as in resolveSegments.
 */
export function participationSegments(
  snapshot: unknown,
  employee: SnapshotEmployee | null,
  at: Date,
): SegmentSnapshot {
  const frozen = parseSegmentSnapshot(snapshot);
  const current = resolveSegments(null, employee, at);
  if (!frozen) return current;
  return {
    ...frozen,
    leaderEmployeeId: frozen.leaderEmployeeId ?? current.leaderEmployeeId,
    gender: frozen.gender ?? current.gender,
    generation: frozen.generation ?? current.generation,
    tenure: frozen.tenure ?? current.tenure,
  };
}

/**
 * A person's leader, as in participationSegments: the one frozen when they
 * answered, else their current manager.
 */
export function leaderOf(snapshot: unknown, managerId: string | null | undefined): string | null {
  return parseSegmentSnapshot(snapshot)?.leaderEmployeeId ?? managerId ?? null;
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
