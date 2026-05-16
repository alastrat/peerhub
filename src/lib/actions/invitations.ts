"use server";

import { prisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/types";
import type { CompanyRole } from "@prisma/client";

// ============================================
// Read an invitation by token (for the accept page)
// ============================================

export interface InvitationPreview {
  id: string;
  email: string;
  role: CompanyRole;
  companyName: string;
  companySlug: string;
  /** Company.locale ("es" by default). The invite acceptance UI uses this
   *  to render copy in the same language the recipient sees throughout
   *  the rest of the platform, instead of inheriting the browser default. */
  companyLocale: string;
  inviterEmail: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  isExpired: boolean;
  departmentName: string | null;
  hubName: string | null;
  // Pre-filled invitee profile (set by SUPER_ADMIN's create-account flow).
  // Null for regular member invites. The accept page renders an editable
  // review form when any of these are populated.
  inviteeFirstName: string | null;
  inviteeLastName: string | null;
  inviteePhone: string | null;
  inviteeJobTitle: string | null;
}

export async function getInvitationByToken(
  token: string,
): Promise<ActionResult<InvitationPreview>> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        company: { select: { name: true, slug: true, locale: true } },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Best-effort lookup of department/hub/inviter for display
    const [department, hub] = await Promise.all([
      invitation.departmentId
        ? prisma.department.findUnique({
            where: { id: invitation.departmentId },
            select: { name: true },
          })
        : null,
      invitation.hubId
        ? prisma.hub.findUnique({
            where: { id: invitation.hubId },
            select: { name: true },
          })
        : null,
    ]);

    const now = new Date();
    const isExpired = invitation.expiresAt < now;

    return {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        companyName: invitation.company.name,
        companySlug: invitation.company.slug,
        companyLocale: invitation.company.locale,
        inviterEmail: null,
        expiresAt: invitation.expiresAt.toISOString(),
        acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
        isExpired,
        departmentName: department?.name ?? null,
        hubName: hub?.name ?? null,
        inviteeFirstName: invitation.inviteeFirstName ?? null,
        inviteeLastName: invitation.inviteeLastName ?? null,
        inviteePhone: invitation.inviteePhone ?? null,
        inviteeJobTitle: invitation.inviteeJobTitle ?? null,
      },
    };
  } catch (error) {
    console.error("Failed to load invitation:", error);
    return { success: false, error: "Failed to load invitation" };
  }
}

// ============================================
// Accept an invitation — creates User, CompanyUser, Employee
// ============================================

export interface AcceptInvitationOverrides {
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
}

export async function acceptInvitation(
  token: string,
  displayName: string,
  overrides: AcceptInvitationOverrides = {},
): Promise<ActionResult<{ email: string; companySlug: string }>> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }
    if (invitation.acceptedAt) {
      return {
        success: false,
        error: "This invitation has already been accepted. Please sign in instead.",
        code: "ALREADY_ACCEPTED",
      };
    }
    if (invitation.expiresAt < new Date()) {
      return {
        success: false,
        error: "This invitation has expired. Please ask the admin to resend it.",
        code: "EXPIRED",
      };
    }

    const email = invitation.email.toLowerCase().trim();
    // Pre-filled invitee profile (set by SUPER_ADMIN's create-account flow).
    // Caller-supplied overrides win — that's how the invite-accept review
    // form lets the invitee correct values before submitting. Falls back to
    // the stored Invitation values when overrides are absent.
    const inviteeFirstName =
      overrides.firstName?.trim() ||
      invitation.inviteeFirstName?.trim() ||
      null;
    const inviteeLastName =
      overrides.lastName?.trim() ||
      invitation.inviteeLastName?.trim() ||
      null;
    const inviteePhone =
      overrides.phone?.trim() || invitation.inviteePhone?.trim() || null;
    const inviteeJobTitle =
      overrides.jobTitle?.trim() ||
      invitation.inviteeJobTitle?.trim() ||
      null;
    // Prefer the invitee's full name (overrides → invitation → displayName
    // param → email local-part).
    const composedFromInvite =
      [inviteeFirstName, inviteeLastName].filter(Boolean).join(" ").trim();
    const name =
      composedFromInvite || displayName.trim() || email.split("@")[0];

    // Defensively resolve the invitation's FK-like references. Older invites
    // may carry sentinel strings like "none" or ids whose target row has since
    // been deleted. We silently drop any that don't resolve to a real row in
    // the invitation's company.
    const isValidId = (v: string | null | undefined): v is string =>
      typeof v === "string" && v.trim().length > 0 && v !== "none";

    const [resolvedDepartmentId, resolvedManagerId, resolvedHubId] = await Promise.all([
      isValidId(invitation.departmentId)
        ? prisma.department
            .findFirst({
              where: { id: invitation.departmentId, companyId: invitation.companyId },
              select: { id: true },
            })
            .then((d) => d?.id ?? null)
        : Promise.resolve(null),
      isValidId(invitation.managerId)
        ? prisma.employee
            .findFirst({
              where: { id: invitation.managerId, companyId: invitation.companyId },
              select: { id: true },
            })
            .then((e) => e?.id ?? null)
        : Promise.resolve(null),
      isValidId(invitation.hubId)
        ? prisma.hub
            .findFirst({
              where: { id: invitation.hubId, companyId: invitation.companyId },
              select: { id: true },
            })
            .then((h) => h?.id ?? null)
        : Promise.resolve(null),
    ]);

    // Use a transaction so we don't leave half-created records if anything fails
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create the User. New users get their profile pre-filled
      // from the invitation's invitee* fields (set by SUPER_ADMIN). Existing
      // users keep their existing profile — they own it. We only fill blanks.
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            name,
            firstName: inviteeFirstName,
            lastName: inviteeLastName,
            phone: inviteePhone,
            globalRole: "USER",
          },
        });
      } else {
        const userBlanks: Record<string, unknown> = {};
        if (!user.firstName && inviteeFirstName) userBlanks.firstName = inviteeFirstName;
        if (!user.lastName && inviteeLastName) userBlanks.lastName = inviteeLastName;
        if (!user.phone && inviteePhone) userBlanks.phone = inviteePhone;
        if (!user.name && composedFromInvite) userBlanks.name = composedFromInvite;
        if (Object.keys(userBlanks).length > 0) {
          user = await tx.user.update({
            where: { id: user.id },
            data: userBlanks,
          });
        }
      }

      // 2. Find or create the Employee record (before CompanyUser so we can link)
      let employee = await tx.employee.findUnique({
        where: {
          companyId_email: {
            companyId: invitation.companyId,
            email,
          },
        },
      });

      if (employee) {
        // Fill in any empty fields from the invitation; don't overwrite existing
        const employeeUpdates: Record<string, unknown> = {};
        if (!employee.name && name) employeeUpdates.name = name;
        if (!employee.title && inviteeJobTitle) employeeUpdates.title = inviteeJobTitle;
        if (resolvedDepartmentId && !employee.departmentId) {
          employeeUpdates.departmentId = resolvedDepartmentId;
        }
        if (resolvedManagerId && !employee.managerId) {
          employeeUpdates.managerId = resolvedManagerId;
        }
        if (resolvedHubId && !employee.hubId) {
          employeeUpdates.hubId = resolvedHubId;
        }
        if (!employee.isActive) employeeUpdates.isActive = true;
        if (Object.keys(employeeUpdates).length > 0) {
          employee = await tx.employee.update({
            where: { id: employee.id },
            data: employeeUpdates,
          });
        }
      } else {
        employee = await tx.employee.create({
          data: {
            companyId: invitation.companyId,
            email,
            name,
            title: inviteeJobTitle,
            departmentId: resolvedDepartmentId,
            managerId: resolvedManagerId,
            hubId: resolvedHubId,
            isActive: true,
          },
        });
      }

      // 3. Create or update the CompanyUser link, connecting to the Employee
      const existingCompanyUser = await tx.companyUser.findUnique({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: invitation.companyId,
          },
        },
      });

      if (existingCompanyUser) {
        await tx.companyUser.update({
          where: { id: existingCompanyUser.id },
          data: {
            role: invitation.role,
            roleConfigId: invitation.roleConfigId,
            employeeId: existingCompanyUser.employeeId ?? employee.id,
            isActive: true,
          },
        });
      } else {
        await tx.companyUser.create({
          data: {
            userId: user.id,
            companyId: invitation.companyId,
            role: invitation.role,
            roleConfigId: invitation.roleConfigId,
            employeeId: employee.id,
            isActive: true,
          },
        });
      }

      // 4. Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      const company = await tx.company.findUnique({
        where: { id: invitation.companyId },
        select: { slug: true },
      });

      return { email, companySlug: company?.slug ?? "" };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}
