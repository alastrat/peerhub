import { CycleStatus, ReviewAssignmentStatus } from "@prisma/client";

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  DRAFT: "Draft",
  NOMINATION: "Nominations Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const CYCLE_STATUS_DESCRIPTIONS: Record<CycleStatus, string> = {
  DRAFT: "Cycle is being configured and not visible to participants",
  NOMINATION: "Participants can nominate peer reviewers",
  IN_PROGRESS: "Reviews are being collected",
  CLOSED: "All reviews completed, reports available",
  ARCHIVED: "Cycle has been archived",
};

export const CYCLE_STATUS_COLORS: Record<CycleStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  NOMINATION: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  CLOSED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-neutral-100 text-neutral-500",
};

export const ASSIGNMENT_STATUS_LABELS: Record<ReviewAssignmentStatus, string> = {
  PENDING: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  DECLINED: "Declined",
};

export const ASSIGNMENT_STATUS_COLORS: Record<ReviewAssignmentStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

export const CYCLE_STATUS_ORDER: CycleStatus[] = [
  "DRAFT",
  "NOMINATION",
  "IN_PROGRESS",
  "CLOSED",
  "ARCHIVED",
];

export function canTransitionTo(
  current: CycleStatus,
  target: CycleStatus
): boolean {
  const currentIndex = CYCLE_STATUS_ORDER.indexOf(current);
  const targetIndex = CYCLE_STATUS_ORDER.indexOf(target);

  // Can only move forward one step (or to ARCHIVED from any state)
  if (target === "ARCHIVED") return true;
  return targetIndex === currentIndex + 1;
}
