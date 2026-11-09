import { prisma } from "@/lib/db/prisma";
import { generateInviteToken, getExpiryDate } from "@/lib/utils";
import { sendInvitationEmail } from "@/lib/email/templates";
import type { CompanyRole, Employee } from "@prisma/client";

// Shared by the employee import (/api/people/import) and the Add employee
// form, so both create people under the same rules.

/** The unique field a new employee would repeat in the company, if any. */
export async function findEmployeeConflict(
  companyId: string,
  email: string,
  nationalId: string | null,
): Promise<"email" | "national_id" | null> {
  const sameEmail = await prisma.employee.findFirst({
    where: { companyId, email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (sameEmail) return "email";
  if (nationalId) {
    const sameNationalId = await prisma.employee.findUnique({
      where: { companyId_nationalId: { companyId, nationalId } },
      select: { id: true },
    });
    if (sameNationalId) return "national_id";
  }
  return null;
}

/**
 * Invite an employee to the platform (a fresh link, even if an older
 * invitation exists). Accepting it links their account to this Employee by
 * email. A brand-new invitation whose email can't be delivered is removed,
 * since nobody could reach its link; the error is rethrown.
 */
export async function inviteEmployee(
  employee: Employee,
  role: CompanyRole,
  inviterName: string | null | undefined,
): Promise<void> {
  const { companyId, email } = employee;
  const existing = await prisma.invitation.findUnique({
    where: { email_companyId: { email, companyId } },
    select: { id: true },
  });
  const fields = {
    role,
    departmentId: employee.departmentId,
    managerId: employee.managerId,
    hubId: employee.hubId,
    token: generateInviteToken(),
    expiresAt: getExpiryDate(7),
    acceptedAt: null,
  };
  const invitation = await prisma.invitation.upsert({
    where: { email_companyId: { email, companyId } },
    create: { email, companyId, ...fields },
    update: fields,
  });
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, locale: true },
  });
  try {
    await sendInvitationEmail({
      to: email,
      inviterName,
      companyName: company?.name,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`,
      locale: company?.locale,
    });
  } catch (error) {
    if (!existing) await prisma.invitation.delete({ where: { id: invitation.id } });
    throw error;
  }
}
