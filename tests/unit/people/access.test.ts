/**
 * Roles and access in Personas: everyone on the roster is a member unless
 * their account (or pending invitation) says otherwise.
 */
import { describe, it, expect } from "vitest";
import { pendingInvitationsWhere, rosterAccess } from "@/lib/people/access";

describe("rosterAccess", () => {
  it("shows people without an account or invitation as members without access", () => {
    expect(rosterAccess(null, null)).toEqual({ role: "MEMBER", access: "NONE" });
    expect(rosterAccess(undefined, undefined)).toEqual({ role: "MEMBER", access: "NONE" });
  });

  it("uses an active account's role", () => {
    expect(rosterAccess({ role: "ADMIN", isActive: true }, null)).toEqual({ role: "ADMIN", access: "ACTIVE" });
    // An account wins over a leftover invitation
    expect(rosterAccess({ role: "MEMBER", isActive: true }, { role: "MANAGER" })).toEqual({ role: "MEMBER", access: "ACTIVE" });
  });

  it("uses a pending invitation's role, the one they'll get on accepting", () => {
    expect(rosterAccess(null, { role: "MANAGER" })).toEqual({ role: "MANAGER", access: "INVITED" });
    expect(rosterAccess({ role: "ADMIN", isActive: false }, { role: "MEMBER" })).toEqual({ role: "MEMBER", access: "INVITED" });
  });

  it("counts a deactivated account as no access, keeping its role", () => {
    expect(rosterAccess({ role: "MANAGER", isActive: false }, null)).toEqual({ role: "MANAGER", access: "NONE" });
  });
});

describe("pendingInvitationsWhere", () => {
  it("only matches invitations not accepted and not expired", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    expect(pendingInvitationsWhere("company-1", now)).toEqual({ companyId: "company-1", acceptedAt: null, expiresAt: { gt: now } });
  });
});
