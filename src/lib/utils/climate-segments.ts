// Where a respondent sat in the org when they submitted. Stored on
// SurveyResponse.segmentSnapshot so reorganizations don't rewrite results.

export interface SegmentSnapshot {
  departmentId: string | null;
  hubId: string | null;
  teamIds: string[];
  /** Direct manager at submission — the "leader" segment. */
  leaderEmployeeId: string | null;
}

export type SegmentScope = "ORGANIZATION" | "DEPARTMENT" | "HUB" | "TEAM" | "LEADER";

export function buildSegmentSnapshot(employee: {
  departmentId: string | null;
  hubId: string | null;
  managerId: string | null;
  teamMemberships: { teamId: string }[];
}): SegmentSnapshot {
  return {
    departmentId: employee.departmentId,
    hubId: employee.hubId,
    teamIds: employee.teamMemberships.map((m) => m.teamId),
    leaderEmployeeId: employee.managerId,
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Parse a stored snapshot; null when missing or malformed. */
export function parseSegmentSnapshot(json: unknown): SegmentSnapshot | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  return {
    departmentId: str(o.departmentId),
    hubId: str(o.hubId),
    teamIds: Array.isArray(o.teamIds) ? o.teamIds.filter((t): t is string => typeof t === "string") : [],
    leaderEmployeeId: str(o.leaderEmployeeId),
  };
}

/**
 * The snapshot when there is one, else the employee's current position
 * (responses submitted before snapshots existed).
 */
export function resolveSegments(
  snapshot: unknown,
  employee: {
    departmentId: string | null;
    hubId: string | null;
    managerId: string | null;
    teamMemberships: { teamId: string }[];
  } | null,
): SegmentSnapshot {
  const parsed = parseSegmentSnapshot(snapshot);
  if (parsed) return parsed;
  if (employee) return buildSegmentSnapshot(employee);
  return { departmentId: null, hubId: null, teamIds: [], leaderEmployeeId: null };
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
