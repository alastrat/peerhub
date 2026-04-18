import { CycleStatus, ReviewAssignmentStatus } from "@prisma/client";

// Flat maps — default to Spanish (platform default locale)
export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  DRAFT: "Borrador",
  NOMINATION: "Nominaciones Abiertas",
  IN_PROGRESS: "En Progreso",
  CLOSED: "Cerrado",
  ARCHIVED: "Archivado",
};

export const CYCLE_STATUS_DESCRIPTIONS: Record<CycleStatus, string> = {
  DRAFT: "El ciclo está siendo configurado y no es visible para los participantes",
  NOMINATION: "Los participantes pueden nominar evaluadores pares",
  IN_PROGRESS: "Las evaluaciones están siendo recopiladas",
  CLOSED: "Todas las evaluaciones completadas, reportes disponibles",
  ARCHIVED: "El ciclo ha sido archivado",
};

export const CYCLE_STATUS_COLORS: Record<CycleStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  NOMINATION: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  CLOSED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-neutral-100 text-neutral-500",
};

export const ASSIGNMENT_STATUS_LABELS: Record<ReviewAssignmentStatus, string> = {
  PENDING: "Sin Iniciar",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completado",
  DECLINED: "Rechazado",
};

export const ASSIGNMENT_STATUS_COLORS: Record<ReviewAssignmentStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

// Locale-aware getters
const CYCLE_STATUS_LABELS_I18N: Record<string, Record<CycleStatus, string>> = {
  es: CYCLE_STATUS_LABELS,
  en: { DRAFT: "Draft", NOMINATION: "Nominations Open", IN_PROGRESS: "In Progress", CLOSED: "Closed", ARCHIVED: "Archived" },
};

const CYCLE_STATUS_DESCRIPTIONS_I18N: Record<string, Record<CycleStatus, string>> = {
  es: CYCLE_STATUS_DESCRIPTIONS,
  en: {
    DRAFT: "Cycle is being configured and not visible to participants",
    NOMINATION: "Participants can nominate peer reviewers",
    IN_PROGRESS: "Reviews are being collected",
    CLOSED: "All reviews completed, reports available",
    ARCHIVED: "Cycle has been archived",
  },
};

const ASSIGNMENT_STATUS_LABELS_I18N: Record<string, Record<ReviewAssignmentStatus, string>> = {
  es: ASSIGNMENT_STATUS_LABELS,
  en: { PENDING: "Not Started", IN_PROGRESS: "In Progress", COMPLETED: "Completed", DECLINED: "Declined" },
};

export function getCycleStatusLabel(status: CycleStatus, locale = "es"): string {
  return CYCLE_STATUS_LABELS_I18N[locale]?.[status] ?? CYCLE_STATUS_LABELS[status] ?? status;
}

export function getCycleStatusDescription(status: CycleStatus, locale = "es"): string {
  return CYCLE_STATUS_DESCRIPTIONS_I18N[locale]?.[status] ?? CYCLE_STATUS_DESCRIPTIONS[status] ?? status;
}

export function getAssignmentStatusLabel(status: ReviewAssignmentStatus, locale = "es"): string {
  return ASSIGNMENT_STATUS_LABELS_I18N[locale]?.[status] ?? ASSIGNMENT_STATUS_LABELS[status] ?? status;
}

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
