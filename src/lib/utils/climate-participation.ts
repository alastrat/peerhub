// Who answered a survey and who didn't, per leader and per demographic group.
// Only counts: participation never says what anyone answered, so groups
// aren't held back by the survey's minimum like scores are.

import { GENDERS, GENERATIONS, TENURES } from "@/lib/constants/demographics";
import type { SegmentSnapshot } from "@/lib/utils/climate-segments";

/** One invited person, placed as in participationSegments (climate-segments). */
export interface ParticipationInvitee {
  isComplete: boolean;
  segments: SegmentSnapshot;
}

export interface ParticipationGroup {
  /** Leader employee id or demographic key (e.g. "GEN_Z"); null groups the people without one. */
  id: string | null;
  /** Leader name or demographic key; null for the people without one. */
  name: string | null;
  invited: number;
  answered: number;
}

export interface SurveyParticipation {
  leaders: ParticipationGroup[];
  gender: ParticipationGroup[];
  generation: ParticipationGroup[];
  tenure: ParticipationGroup[];
}

function countBy(invitees: ParticipationInvitee[], keyOf: (s: SegmentSnapshot) => string | null) {
  const groups = new Map<string | null, { invited: number; answered: number }>();
  for (const p of invitees) {
    const key = keyOf(p.segments);
    const g = groups.get(key) ?? { invited: 0, answered: 0 };
    g.invited++;
    if (p.isComplete) g.answered++;
    groups.set(key, g);
  }
  return groups;
}

/** The people without a value always go last. */
function withoutValueLast(compare: (a: ParticipationGroup, b: ParticipationGroup) => number) {
  return (a: ParticipationGroup, b: ParticipationGroup) =>
    a.id == null || b.id == null ? Number(a.id == null) - Number(b.id == null) : compare(a, b);
}

/** Answered vs. invited per direct manager (`leaderEmployeeId`), by leader name. */
export function leaderParticipation(
  invitees: ParticipationInvitee[],
  leaderNames: Map<string, string>,
): ParticipationGroup[] {
  return [...countBy(invitees, (s) => s.leaderEmployeeId)]
    .map(([id, g]) => ({ id, name: id == null ? null : (leaderNames.get(id) ?? "—"), ...g }))
    .sort(withoutValueLast((a, b) => a.name!.localeCompare(b.name!, "es")));
}

/** Answered vs. invited per demographic group, in the groups' natural order. */
function demographicParticipation(
  invitees: ParticipationInvitee[],
  keyOf: (s: SegmentSnapshot) => string | null,
  order: readonly string[],
): ParticipationGroup[] {
  return [...countBy(invitees, keyOf)]
    .map(([id, g]) => ({ id, name: id, ...g }))
    .sort(withoutValueLast((a, b) => order.indexOf(a.id!) - order.indexOf(b.id!)));
}

export function buildParticipation(
  invitees: ParticipationInvitee[],
  leaderNames: Map<string, string>,
): SurveyParticipation {
  return {
    leaders: leaderParticipation(invitees, leaderNames),
    gender: demographicParticipation(invitees, (s) => s.gender, GENDERS),
    generation: demographicParticipation(invitees, (s) => s.generation, GENERATIONS),
    tenure: demographicParticipation(invitees, (s) => s.tenure, TENURES),
  };
}
