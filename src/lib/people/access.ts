import type { CompanyRole } from "@prisma/client";

/**
 * Whether someone on the roster can use the platform: an account, a pending
 * invitation, a deactivated account, or none of these.
 */
export const ACCESS_STATUSES = ["ACTIVE", "INVITED", "DEACTIVATED", "NONE"] as const;
export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export interface RosterAccess {
  role: CompanyRole;
  access: AccessStatus;
}

/**
 * Everyone on the roster is a member, platform account or not; only their
 * account (or the pending invitation that will create it) can give them
 * another role. A deactivated account keeps its role, which comes back if
 * it's reactivated.
 */
export function rosterAccess(
  account: { role: CompanyRole; isActive: boolean } | null | undefined,
  pendingInvitation: { role: CompanyRole } | null | undefined,
): RosterAccess {
  if (account?.isActive) return { role: account.role, access: "ACTIVE" };
  if (pendingInvitation) return { role: pendingInvitation.role, access: "INVITED" };
  if (account) return { role: account.role, access: "DEACTIVATED" };
  return { role: "MEMBER", access: "NONE" };
}

/** Invitations of a company that can still be accepted. */
export function pendingInvitationsWhere(companyId: string, now: Date = new Date()) {
  return { companyId, acceptedAt: null, expiresAt: { gt: now } };
}
