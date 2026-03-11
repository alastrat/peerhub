"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import {
  domainSchema,
  updateGlobalRoleSchema,
  createPlatformCompanySchema,
} from "@/lib/validations/platform";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

// ============================================
// SUPER ADMIN DOMAINS
// ============================================

export async function addSuperAdminDomain(
  rawDomain: string
): Promise<ActionResult<{ id: string; domain: string }>> {
  try {
    await requireSuperAdmin();

    const domain = domainSchema.parse(rawDomain);

    const existing = await prisma.superAdminDomain.findUnique({
      where: { domain },
    });
    if (existing) {
      return { success: false, error: "Domain already exists" };
    }

    const record = await prisma.superAdminDomain.create({
      data: { domain },
    });

    revalidatePath("/settings/platform/domains");
    return { success: true, data: { id: record.id, domain: record.domain } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add domain",
    };
  }
}

export async function removeSuperAdminDomain(
  id: string
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    await prisma.superAdminDomain.delete({ where: { id } });

    revalidatePath("/settings/platform/domains");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove domain",
    };
  }
}

// ============================================
// USER GLOBAL ROLE MANAGEMENT
// ============================================

export async function updateUserGlobalRole(
  input: { userId: string; globalRole: "SUPER_ADMIN" | "USER" }
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();

    const parsed = updateGlobalRoleSchema.parse(input);

    if (parsed.userId === session.user.id) {
      return { success: false, error: "Cannot change your own global role" };
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.userId },
    });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    await prisma.user.update({
      where: { id: parsed.userId },
      data: { globalRole: parsed.globalRole },
    });

    revalidatePath("/settings/platform/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function deletePlatformUser(
  userId: string
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();

    if (userId === session.user.id) {
      return { success: false, error: "Cannot delete your own account" };
    }

    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/settings/platform/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

// ============================================
// PLATFORM COMPANY MANAGEMENT
// ============================================

export async function createPlatformCompany(
  input: { name: string; slug: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();

    const parsed = createPlatformCompanySchema.parse(input);

    const existing = await prisma.company.findUnique({
      where: { slug: parsed.slug },
    });
    if (existing) {
      return { success: false, error: "Slug is already taken" };
    }

    const company = await prisma.company.create({
      data: { name: parsed.name, slug: parsed.slug },
    });

    revalidatePath("/settings/platform/companies");
    return { success: true, data: { id: company.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create company",
    };
  }
}

export async function deletePlatformCompany(
  companyId: string
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    await prisma.company.delete({ where: { id: companyId } });

    revalidatePath("/settings/platform/companies");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete company",
    };
  }
}

// ============================================
// COMPANY MEMBERS
// ============================================

async function requireCompanyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) throw new Error("Unauthorized");
  const companyId = session.companyUser?.companyId;
  if (!companyId) throw new Error("No active company");
  return { session, companyId };
}

export async function inviteMember(input: {
  email: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  companyId: string;
}): Promise<ActionResult<{ inviteUrl: string }>> {
  try {
    const { session, companyId } = await requireCompanyAdmin();
    const { sendEmail } = await import("@/lib/email/resend");

    // Enforce: can only invite to the company the admin is currently viewing
    if (input.companyId !== companyId) {
      return { success: false, error: "Cannot invite to a different company" };
    }

    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false, error: "Invalid email address" };
    }

    // Check if already a member
    const existing = await prisma.companyUser.findFirst({
      where: {
        companyId,
        user: { email },
      },
    });
    if (existing) {
      return { success: false, error: "User is already a member" };
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findUnique({
      where: { email_companyId: { email, companyId } },
    });
    if (existingInvite && !existingInvite.acceptedAt) {
      return { success: false, error: "Invitation already sent to this email" };
    }

    // Upsert invitation
    const invitation = await prisma.invitation.upsert({
      where: { email_companyId: { email, companyId } },
      update: {
        role: input.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
      },
      create: {
        email,
        companyId,
        role: input.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: { company: { select: { name: true } } },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:4999";
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    const emailResult = await sendEmail({
      to: email,
      subject: `You're invited to join ${invitation.company.name} on Kultiva`,
      html: `
        <h2>You've been invited!</h2>
        <p><strong>${session.user.name || session.user.email}</strong> has invited you to join <strong>${invitation.company.name}</strong> on Kultiva.</p>
        <p>Click the link below to accept:</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#613171;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p><em>This invitation expires in 7 days.</em></p>
      `,
      text: `You've been invited to join ${invitation.company.name} on Kultiva. Accept here: ${inviteUrl}`,
    });

    if (!emailResult.success) {
      // Roll back the invitation if email failed
      await prisma.invitation.delete({ where: { id: invitation.id } });
      return { success: false, error: emailResult.error || "Failed to send email" };
    }

    revalidatePath("/settings/company/members");
    return { success: true, data: { inviteUrl } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}

export async function updateMemberRole(input: {
  companyUserId: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
}): Promise<ActionResult> {
  try {
    const { session, companyId } = await requireCompanyAdmin();

    const member = await prisma.companyUser.findUnique({
      where: { id: input.companyUserId },
    });
    if (!member) return { success: false, error: "Member not found" };

    if (member.companyId !== companyId) {
      return { success: false, error: "Member does not belong to this company" };
    }

    if (member.userId === session.user.id) {
      return { success: false, error: "Cannot change your own role" };
    }

    await prisma.companyUser.update({
      where: { id: input.companyUserId },
      data: { role: input.role },
    });

    revalidatePath("/settings/company/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function toggleMemberActive(input: {
  companyUserId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    const { session, companyId } = await requireCompanyAdmin();

    const member = await prisma.companyUser.findUnique({
      where: { id: input.companyUserId },
    });
    if (!member) return { success: false, error: "Member not found" };

    if (member.companyId !== companyId) {
      return { success: false, error: "Member does not belong to this company" };
    }

    if (member.userId === session.user.id) {
      return { success: false, error: "Cannot deactivate your own account" };
    }

    await prisma.companyUser.update({
      where: { id: input.companyUserId },
      data: { isActive: input.isActive },
    });

    revalidatePath("/settings/company/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

export async function removeMember(
  companyUserId: string
): Promise<ActionResult> {
  try {
    const { session, companyId } = await requireCompanyAdmin();

    const member = await prisma.companyUser.findUnique({
      where: { id: companyUserId },
    });
    if (!member) return { success: false, error: "Member not found" };

    if (member.companyId !== companyId) {
      return { success: false, error: "Member does not belong to this company" };
    }

    if (member.userId === session.user.id) {
      return { success: false, error: "Cannot remove yourself" };
    }

    await prisma.companyUser.delete({ where: { id: companyUserId } });

    revalidatePath("/settings/company/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}

export async function updateMemberDetails(input: {
  companyUserId: string;
  title?: string | null;
  employeeCode?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
  startDate?: string | null;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const member = await prisma.companyUser.findUnique({
      where: { id: input.companyUserId },
      include: { employee: true },
    });
    if (!member) return { success: false, error: "Member not found" };
    if (member.companyId !== companyId) {
      return { success: false, error: "Member does not belong to this company" };
    }

    if (!member.employee) {
      return { success: false, error: "No employee record linked to this member" };
    }

    if (input.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!dept || dept.companyId !== companyId) {
        return { success: false, error: "Department not found" };
      }
    }

    if (input.managerId) {
      if (input.managerId === member.employee.id) {
        return { success: false, error: "An employee cannot be their own manager" };
      }
      const manager = await prisma.employee.findUnique({
        where: { id: input.managerId },
      });
      if (!manager || manager.companyId !== companyId) {
        return { success: false, error: "Manager not found" };
      }
    }

    await prisma.employee.update({
      where: { id: member.employee.id },
      data: {
        title: input.title !== undefined ? (input.title || null) : undefined,
        employeeCode: input.employeeCode !== undefined ? (input.employeeCode || null) : undefined,
        departmentId: input.departmentId !== undefined ? (input.departmentId || null) : undefined,
        managerId: input.managerId !== undefined ? (input.managerId || null) : undefined,
        startDate: input.startDate !== undefined
          ? (input.startDate ? new Date(input.startDate) : null)
          : undefined,
      },
    });

    revalidatePath("/settings/company/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update member",
    };
  }
}

export async function cancelInvitation(
  invitationId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) return { success: false, error: "Invitation not found" };

    if (invitation.companyId !== companyId) {
      return { success: false, error: "Invitation does not belong to this company" };
    }

    await prisma.invitation.delete({ where: { id: invitationId } });
    revalidatePath("/settings/company/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}

export async function resendInvitation(
  invitationId: string
): Promise<ActionResult> {
  try {
    const { session, companyId } = await requireCompanyAdmin();
    const { sendEmail } = await import("@/lib/email/resend");

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { company: { select: { name: true } } },
    });
    if (!invitation) return { success: false, error: "Invitation not found" };

    if (invitation.companyId !== companyId) {
      return { success: false, error: "Invitation does not belong to this company" };
    }

    // Refresh expiry
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:4999";
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    const emailResult = await sendEmail({
      to: invitation.email,
      subject: `Reminder: You're invited to join ${invitation.company.name} on Kultiva`,
      html: `
        <h2>You've been invited!</h2>
        <p><strong>${session.user.name || session.user.email}</strong> has invited you to join <strong>${invitation.company.name}</strong> on Kultiva.</p>
        <p>Click the link below to accept:</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#613171;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p><em>This invitation expires in 7 days.</em></p>
      `,
      text: `You've been invited to join ${invitation.company.name} on Kultiva. Accept here: ${inviteUrl}`,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error || "Failed to send email" };
    }

    revalidatePath("/settings/company/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resend invitation",
    };
  }
}

// ============================================
// COMPANY DOMAIN
// ============================================

export async function updateCompanyDomain(input: {
  companyId: string;
  domain: string | null;
}): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const domain = input.domain?.trim().toLowerCase() || null;

    if (domain) {
      const valid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain);
      if (!valid) {
        return { success: false, error: "Invalid domain format" };
      }
    }

    await prisma.company.update({
      where: { id: input.companyId },
      data: { domain },
    });

    revalidatePath("/settings/company/domain");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update domain",
    };
  }
}

// ============================================
// COMPANY FEATURES
// ============================================

const FEATURE_FIELD_MAP = {
  ats: "featureAts",
  onboarding: "featureOnboarding",
  workEnv: "featureWorkEnv",
} as const;

export async function toggleCompanyFeature(input: {
  companyId: string;
  feature: "ats" | "onboarding" | "workEnv";
  enabled: boolean;
}): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const field = FEATURE_FIELD_MAP[input.feature];
    if (!field) {
      return { success: false, error: "Invalid feature" };
    }

    await prisma.company.update({
      where: { id: input.companyId },
      data: { [field]: input.enabled },
    });

    revalidatePath("/settings/company/features");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle feature",
    };
  }
}

// ============================================
// PROFILE
// ============================================

export async function updateProfile(
  input: { name?: string; image?: string }
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.image !== undefined && { image: input.image }),
      },
    });

    revalidatePath("/settings/profile");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}
