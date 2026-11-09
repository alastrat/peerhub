import type { CompanyRole } from "@prisma/client";

/** Whether someone on the roster can use the platform: an account, a pending invitation, or neither. */
export const ACCESS_STATUSES = ["ACTIVE", "INVITED", "NONE"] as const;
export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export interface RosterAccess {
  role: CompanyRole;
  access: AccessStatus;
}

/**
 * Everyone on the roster is a member, platform account or not; only their
 * account (or the pending invitation that will create it) can give them
 * another role. A deactivated account counts as no access.
 */
export function rosterAccess(
  account: { role: CompanyRole; isActive: boolean } | null | undefined,
  pendingInvitation: { role: CompanyRole } | null | undefined,
): RosterAccess {
  if (account?.isActive) return { role: account.role, access: "ACTIVE" };
  if (pendingInvitation) return { role: pendingInvitation.role, access: "INVITED" };
  return { role: account?.role ?? "MEMBER", access: "NONE" };
}

/** Invitations of a company that can still be accepted. */
export function pendingInvitationsWhere(companyId: string, now: Date = new Date()) {
  return { companyId, acceptedAt: null, expiresAt: { gt: now } };
}
