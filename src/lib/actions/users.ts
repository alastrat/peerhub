"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { CompanyUser, CompanyRole, Gender, JobLevel, Prisma } from "@prisma/client";
import {
  addEmployeeSchema,
  updateEmployeeSchema,
  type AddEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/validations/user";
import { findEmployeeConflict, inviteEmployee } from "@/lib/people/new-employee";
import { pendingInvitationsWhere } from "@/lib/people/access";
import { isValidBirthDate } from "@/lib/constants/demographics";
import { normalizeNationalId } from "@/lib/utils/employee-import";
import { actionError } from "@/lib/auth/action-locale";
import { sendInvitationEmail } from "@/lib/email/templates";
import { EmailDeliveryError } from "@/lib/email/resend";
import { generateInviteToken, getExpiryDate } from "@/lib/utils";

interface CreateUserInput {
  email: string;
  name: string;
  title?: string;
  employeeCode?: string;
  departmentId?: string;
  managerId?: string;
  hubId?: string;
  startDate?: string | Date | null;
  role?: CompanyRole;
  gender?: Gender | null;
  birthDate?: string | Date | null;
  nationalId?: string | null;
  jobLevel?: JobLevel | null;
}

// Cédulas are unique per company (the import links leaders by them)
async function nationalIdTaken(companyId: string, nationalId: string, exceptEmployeeId?: string): Promise<boolean> {
  const other = await prisma.employee.findFirst({
    where: { companyId, nationalId, ...(exceptEmployeeId && { id: { not: exceptEmployeeId } }) },
    select: { id: true },
  });
  return other !== null;
}

/**
 * Add one employee by hand: the same fields and rules as a row of the
 * employee import. The person is created right away (so surveys can include
 * them); platform access comes only with the optional emailed invitation.
 */
export async function addEmployee(
  input: AddEmployeeInput,
): Promise<ActionResult<{ employeeId: string; invited: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") return actionError("unauthorized");
    const companyId = session.companyUser.companyId;

    const parsed = addEmployeeSchema().safeParse(input);
    if (!parsed.success) return actionError("invalid_employee");
    const data = parsed.data;
    if (data.birthDate && !isValidBirthDate(data.birthDate)) return actionError("invalid_birth_date");

    const conflict = await findEmployeeConflict(companyId, data.email ?? null, data.nationalId);
    if (conflict === "email") return actionError("employee_email_taken");
    if (conflict === "national_id") return actionError("national_id_taken");

    // The selects only offer this company's records, but one may have been deleted since
    const [department, manager, hub] = await Promise.all([
      data.departmentId ? prisma.department.findFirst({ where: { id: data.departmentId, companyId }, select: { id: true } }) : null,
      data.managerId ? prisma.employee.findFirst({ where: { id: data.managerId, companyId }, select: { id: true } }) : null,
      data.hubId ? prisma.hub.findFirst({ where: { id: data.hubId, companyId }, select: { id: true } }) : null,
    ]);
    if ((data.departmentId && !department) || (data.managerId && !manager) || (data.hubId && !hub)) {
      return actionError("selection_not_found");
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        nationalId: data.nationalId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        title: data.title || null,
        hubId: hub?.id,
        departmentId: department?.id,
        managerId: manager?.id,
        startDate: data.startDate ?? null,
        gender: data.gender ?? null,
        birthDate: data.birthDate ?? null,
        jobLevel: data.jobLevel ?? null,
      },
    });

    let invited = false;
    let warning: string | undefined;
    if (data.invite && !employee.email) {
      // Nowhere to send it: they answer surveys from a personal link
      warning = (await actionError("invite_needs_email")).error;
    } else if (data.invite && employee.email) {
      try {
        await inviteEmployee({ ...employee, email: employee.email }, data.role, session.user.name);
        invited = true;
      } catch (error) {
        console.error("Add employee invitation failed:", error);
        warning = (await actionError("invite_failed")).error;
      }
    }

    revalidatePath("/people");
    return { success: true, data: { employeeId: employee.id, invited }, ...(warning && { warning }) };
  } catch (error) {
    console.error("Failed to add employee:", error);
    return actionError("failed_add_employee");
  }
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

    // Normalize form sentinel values. Shadcn's Select can't use empty strings
    // as values, so the form uses the literal "none" for "no selection".
    // Treat that (and empty strings) as null so we don't store invalid FKs.
    const normalizeId = (v: string | undefined | null): string | null => {
      if (!v) return null;
      const trimmed = v.trim();
      if (!trimmed || trimmed === "none") return null;
      return trimmed;
    };

    const normalizedDepartmentId = normalizeId(input.departmentId);
    const normalizedManagerId = normalizeId(input.managerId);

    // Validate referenced rows actually exist in THIS company. If the admin
    // selected a value that was since deleted, fall back to null rather than
    // persisting a dangling reference.
    if (normalizedDepartmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: normalizedDepartmentId, companyId },
        select: { id: true },
      });
      if (!dept) {
        return { success: false, error: "Selected department does not exist" };
      }
    }
    if (normalizedManagerId) {
      const mgr = await prisma.employee.findFirst({
        where: { id: normalizedManagerId, companyId },
        select: { id: true },
      });
      if (!mgr) {
        return { success: false, error: "Selected manager does not exist" };
      }
    }

    // Create invitation
    const token = generateInviteToken();
    const invitation = await prisma.invitation.create({
      data: {
        email: input.email,
        companyId,
        role: input.role || "MEMBER",
        departmentId: normalizedDepartmentId,
        managerId: normalizedManagerId,
        token,
        expiresAt: getExpiryDate(7),
      },
    });

    // Get company name for email
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    // Send invitation email. If this fails, the invitation row is useless
    // (the invitee can't reach the sign-up link), so roll it back and return
    // a clear error.
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
    try {
      await sendInvitationEmail({
        to: input.email,
        inviterName: session.user.name,
        companyName: company?.name,
        inviteUrl,
        locale: company?.locale,
      });
    } catch (emailError) {
      await prisma.invitation.delete({ where: { id: invitation.id } });
      if (emailError instanceof EmailDeliveryError) {
        return {
          success: false,
          error: `Could not deliver the invitation email: ${emailError.message}`,
          code: "EMAIL_DELIVERY_FAILED",
        };
      }
      throw emailError;
    }

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

    // Same rule as the edit page and CSV import, checked before anything is written
    const birthDate = input.birthDate ? new Date(input.birthDate) : undefined;
    if (birthDate && !isValidBirthDate(birthDate)) return { success: false, error: "Invalid date of birth" };
    const nationalId = input.nationalId ? normalizeNationalId(input.nationalId) || null : null;
    if (nationalId && (await nationalIdTaken(companyId, nationalId))) return actionError("national_id_taken");

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
        gender: input.gender ?? undefined,
        birthDate,
        nationalId: nationalId ?? undefined,
        jobLevel: input.jobLevel ?? undefined,
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

class InvitationNotPendingError extends Error {}

/**
 * Update an employee from the People edit page, by Employee id. Unlike
 * updateUser (CompanyUser id), this also works for people without platform
 * access, and covers demographic fields.
 */
export async function updateEmployee(employeeId: string, input: UpdateEmployeeInput): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }
    const companyId = session.companyUser.companyId;

    const parsed = updateEmployeeSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    const data = parsed.data;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, email: true, companyUser: { select: { id: true } } },
    });
    if (!employee) return { success: false, error: "Employee not found" };
    if (data.managerId && data.managerId === employeeId) {
      return { success: false, error: "An employee can't be their own manager" };
    }
    if (data.birthDate && !isValidBirthDate(data.birthDate)) return { success: false, error: "Invalid date of birth" };
    if (data.nationalId && (await nationalIdTaken(companyId, data.nationalId, employeeId))) return actionError("national_id_taken");
    // An email can be added to someone who has none, never changed
    const newEmail = !employee.email && data.email ? data.email : null;
    if (newEmail && (await findEmployeeConflict(companyId, newEmail, null))) return actionError("employee_email_taken");

    const employeeData: Prisma.EmployeeUncheckedUpdateInput = {};
    if (data.name !== undefined) employeeData.name = data.name;
    if (data.title !== undefined) employeeData.title = data.title;
    if (data.departmentId !== undefined) employeeData.departmentId = data.departmentId;
    if (data.managerId !== undefined) employeeData.managerId = data.managerId;
    if (data.hubId !== undefined) employeeData.hubId = data.hubId;
    if (data.isActive !== undefined) employeeData.isActive = data.isActive;
    if (data.startDate !== undefined) employeeData.startDate = data.startDate;
    if (data.gender !== undefined) employeeData.gender = data.gender;
    if (data.birthDate !== undefined) employeeData.birthDate = data.birthDate;
    if (data.nationalId !== undefined) employeeData.nationalId = data.nationalId;
    if (data.jobLevel !== undefined) employeeData.jobLevel = data.jobLevel;
    if (data.phone !== undefined) employeeData.phone = data.phone;
    if (newEmail) employeeData.email = newEmail;

    // One transaction, so the employee and their account never disagree on
    // status. The form only sends role and status when the admin changed
    // them, so saving other fields never reactivates a deactivated account
    // or overwrites a role changed meanwhile.
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id: employee.id }, data: employeeData });
      if (employee.companyUser && (data.role !== undefined || data.isActive !== undefined)) {
        await tx.companyUser.update({
          where: { id: employee.companyUser.id },
          data: {
            ...(data.role !== undefined && { role: data.role }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
        });
      } else if (!employee.companyUser && employee.email && data.role !== undefined) {
        // No account yet: the role is the one their pending invitation will give
        const { count } = await tx.invitation.updateMany({
          where: { ...pendingInvitationsWhere(companyId), email: { equals: employee.email, mode: "insensitive" } },
          data: { role: data.role },
        });
        // It expired or was removed since the form opened: nothing changed
        if (count === 0) throw new InvitationNotPendingError();
      }
    });

    revalidatePath("/people");
    revalidatePath(`/people/${employeeId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof InvitationNotPendingError) return actionError("invitation_not_pending");
    console.error("Failed to update employee:", error);
    return { success: false, error: "Failed to update employee" };
  }
}

/** Deactivate an employee (and their platform access, if any), by Employee id. */
export async function deactivateEmployee(employeeId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }
    const companyId = session.companyUser.companyId;
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, companyUser: { select: { id: true } } },
    });
    if (!employee) return { success: false, error: "Employee not found" };

    // Sign-in checks CompanyUser.isActive, so it must change together with the employee
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id: employee.id }, data: { isActive: false } });
      if (employee.companyUser) {
        await tx.companyUser.update({ where: { id: employee.companyUser.id }, data: { isActive: false } });
      }
    });
    revalidatePath("/people");
    return { success: true };
  } catch (error) {
    console.error("Failed to deactivate employee:", error);
    return { success: false, error: "Failed to deactivate employee" };
  }
}
