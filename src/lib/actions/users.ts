"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { CompanyUser, CompanyRole } from "@prisma/client";
import { sendInvitationEmail } from "@/lib/email/templates";
import { generateInviteToken, getExpiryDate } from "@/lib/utils";

interface CreateUserInput {
  email: string;
  name: string;
  title?: string;
  employeeCode?: string;
  departmentId?: string;
  managerId?: string;
  hubId?: string;
  startDate?: string | Date;
  role?: CompanyRole;
}

interface InviteUserInput {
  email: string;
  role?: CompanyRole;
  departmentId?: string;
  managerId?: string;
}

export async function inviteUser(
  input: InviteUserInput
): Promise<ActionResult<{ invitationId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Check if user already exists in this company
    const existingUser = await prisma.companyUser.findFirst({
      where: {
        companyId,
        user: { email: input.email },
      },
    });

    if (existingUser) {
      return { success: false, error: "User already exists in this company" };
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email: input.email,
        companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return { success: false, error: "An invitation is already pending for this email" };
    }

    // Create invitation
    const token = generateInviteToken();
    const invitation = await prisma.invitation.create({
      data: {
        email: input.email,
        companyId,
        role: input.role || "MEMBER",
        departmentId: input.departmentId,
        managerId: input.managerId,
        token,
        expiresAt: getExpiryDate(7),
      },
    });

    // Get company name for email
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
    await sendInvitationEmail({
      to: input.email,
      inviterName: session.user.name || "Your admin",
      companyName: company?.name || "Your company",
      inviteUrl,
    });

    revalidatePath("/people");
    return { success: true, data: { invitationId: invitation.id } };
  } catch (error) {
    console.error("Failed to invite user:", error);
    return { success: false, error: "Failed to send invitation" };
  }
}

export async function createUser(
  input: CreateUserInput
): Promise<ActionResult<CompanyUser>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Check if user email exists
    let user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
        },
      });
    }

    // Check if already in company
    const existingCompanyUser = await prisma.companyUser.findFirst({
      where: {
        userId: user.id,
        companyId,
      },
    });

    if (existingCompanyUser) {
      return { success: false, error: "User already exists in this company" };
    }

    // Resolve hubId: use provided or default hub
    let hubId = input.hubId;
    if (!hubId) {
      const defaultHub = await prisma.hub.findFirst({
        where: { companyId, isDefault: true },
        select: { id: true },
      });
      hubId = defaultHub?.id;
    }

    // Create Employee record first with org-chart fields
    const employee = await prisma.employee.create({
      data: {
        companyId,
        email: input.email,
        name: input.name,
        title: input.title,
        employeeCode: input.employeeCode,
        departmentId: input.departmentId,
        managerId: input.managerId,
        hubId: hubId || undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
      },
    });

    // Create CompanyUser linked to Employee
    const companyUser = await prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId,
        role: input.role || "MEMBER",
        employeeId: employee.id,
      },
    });

    revalidatePath("/people");
    return { success: true, data: companyUser };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(
  userId: string,
  data: {
    title?: string | null;
    departmentId?: string | null;
    managerId?: string | null;
    hubId?: string | null;
    role?: CompanyRole;
    isActive?: boolean;
  }
): Promise<ActionResult<CompanyUser>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify user belongs to company
    const existingUser = await prisma.companyUser.findFirst({
      where: { id: userId, companyId },
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Separate CompanyUser fields from Employee fields
    const companyUserData: { role?: CompanyRole; isActive?: boolean } = {};
    if (data.role !== undefined) companyUserData.role = data.role;
    if (data.isActive !== undefined) companyUserData.isActive = data.isActive;

    // Update CompanyUser fields if any
    const companyUser = await prisma.companyUser.update({
      where: { id: userId },
      data: companyUserData,
    });

    // Update Employee fields (title, departmentId, managerId, hubId) if linked
    const hasEmployeeFields = data.title !== undefined || data.departmentId !== undefined || data.managerId !== undefined || data.hubId !== undefined;
    if (hasEmployeeFields && existingUser.employeeId) {
      const employeeData: { title?: string | null; departmentId?: string | null; managerId?: string | null; hubId?: string | null } = {};
      if (data.title !== undefined) employeeData.title = data.title;
      if (data.departmentId !== undefined) employeeData.departmentId = data.departmentId;
      if (data.managerId !== undefined) employeeData.managerId = data.managerId;
      if (data.hubId !== undefined) employeeData.hubId = data.hubId;

      await prisma.employee.update({
        where: { id: existingUser.employeeId },
        data: employeeData,
      });
    }

    revalidatePath("/people");
    return { success: true, data: companyUser };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify user belongs to company
    const existingUser = await prisma.companyUser.findFirst({
      where: { id: userId, companyId },
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Soft delete - just deactivate
    await prisma.companyUser.update({
      where: { id: userId },
      data: { isActive: false },
    });

    revalidatePath("/people");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
