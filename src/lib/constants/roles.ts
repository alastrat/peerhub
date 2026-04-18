import { CompanyRole, GlobalRole, ReviewerType } from "@prisma/client";

// Flat maps — default to Spanish (platform default locale)
export const ROLE_LABELS: Record<CompanyRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  MEMBER: "Miembro",
};

export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  SUPER_ADMIN: "Super Admin",
  USER: "Usuario",
};

export const REVIEWER_TYPE_LABELS: Record<ReviewerType, string> = {
  SELF: "Autoevaluación",
  MANAGER: "Gerente",
  PEER: "Par",
  DIRECT_REPORT: "Reporte Directo",
  EXTERNAL: "Externo",
};

export const REVIEWER_TYPE_DESCRIPTIONS: Record<ReviewerType, string> = {
  SELF: "Autoevaluación de tu propio desempeño",
  MANAGER: "Retroalimentación de tu gerente directo",
  PEER: "Retroalimentación de colegas de nivel similar",
  DIRECT_REPORT: "Retroalimentación de personas que te reportan",
  EXTERNAL: "Retroalimentación de partes interesadas externas",
};

// Locale-aware getters
const ROLE_LABELS_I18N: Record<string, Record<CompanyRole, string>> = {
  es: ROLE_LABELS,
  en: { ADMIN: "Admin", MANAGER: "Manager", MEMBER: "Member" },
};

const GLOBAL_ROLE_LABELS_I18N: Record<string, Record<GlobalRole, string>> = {
  es: GLOBAL_ROLE_LABELS,
  en: { SUPER_ADMIN: "Super Admin", USER: "User" },
};

const REVIEWER_TYPE_LABELS_I18N: Record<string, Record<ReviewerType, string>> = {
  es: REVIEWER_TYPE_LABELS,
  en: { SELF: "Self", MANAGER: "Manager", PEER: "Peer", DIRECT_REPORT: "Direct Report", EXTERNAL: "External" },
};

export function getRoleLabel(role: CompanyRole, locale = "es"): string {
  return ROLE_LABELS_I18N[locale]?.[role] ?? ROLE_LABELS[role] ?? role;
}

export function getGlobalRoleLabel(role: GlobalRole, locale = "es"): string {
  return GLOBAL_ROLE_LABELS_I18N[locale]?.[role] ?? GLOBAL_ROLE_LABELS[role] ?? role;
}

export function getReviewerTypeLabel(type: ReviewerType, locale = "es"): string {
  return REVIEWER_TYPE_LABELS_I18N[locale]?.[type] ?? REVIEWER_TYPE_LABELS[type] ?? type;
}

export function getReviewerTypeDescription(type: ReviewerType, locale = "es"): string {
  const descs: Record<string, Record<ReviewerType, string>> = {
    es: REVIEWER_TYPE_DESCRIPTIONS,
    en: {
      SELF: "Self-assessment of your own performance",
      MANAGER: "Feedback from your direct manager",
      PEER: "Feedback from colleagues at similar level",
      DIRECT_REPORT: "Feedback from people who report to you",
      EXTERNAL: "Feedback from external stakeholders",
    },
  };
  return descs[locale]?.[type] ?? REVIEWER_TYPE_DESCRIPTIONS[type] ?? type;
}

// Hierarchy & helpers
export const ROLE_HIERARCHY: Record<CompanyRole, number> = {
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

export function canManageRole(currentRole: CompanyRole, targetRole: CompanyRole): boolean {
  return ROLE_HIERARCHY[currentRole] > ROLE_HIERARCHY[targetRole];
}

export function isAdmin(role: CompanyRole): boolean {
  return role === "ADMIN";
}

export function isManager(role: CompanyRole): boolean {
  return role === "MANAGER" || role === "ADMIN";
}
