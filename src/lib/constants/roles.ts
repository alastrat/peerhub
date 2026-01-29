import { CompanyRole, GlobalRole, ReviewerType } from "@prisma/client";

export const ROLE_LABELS: Record<CompanyRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  SUPER_ADMIN: "Super Admin",
  USER: "User",
};

export const REVIEWER_TYPE_LABELS: Record<ReviewerType, string> = {
  SELF: "Self",
  MANAGER: "Manager",
  PEER: "Peer",
  DIRECT_REPORT: "Direct Report",
  EXTERNAL: "External",
};

export const REVIEWER_TYPE_DESCRIPTIONS: Record<ReviewerType, string> = {
  SELF: "Self-assessment of your own performance",
  MANAGER: "Feedback from your direct manager",
  PEER: "Feedback from colleagues at similar level",
  DIRECT_REPORT: "Feedback from people who report to you",
  EXTERNAL: "Feedback from external stakeholders",
};

export const ROLE_HIERARCHY: Record<CompanyRole, number> = {
  ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

export function canManageRole(
  currentRole: CompanyRole,
  targetRole: CompanyRole
): boolean {
  return ROLE_HIERARCHY[currentRole] > ROLE_HIERARCHY[targetRole];
}

export function isAdmin(role: CompanyRole): boolean {
  return role === "ADMIN";
}

export function isManager(role: CompanyRole): boolean {
  return role === "MANAGER" || role === "ADMIN";
}
