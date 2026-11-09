import type { CompanyRole, Gender, JobLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { pendingInvitationsWhere, rosterAccess, type AccessStatus } from "@/lib/people/access";

/** One person in Personas: every field the employee import loads, plus their role and platform access. */
export interface PersonRow {
  id: string;
  name: string;
  email: string;
  nationalId: string | null;
  title: string | null;
  department: string | null;
  hub: string | null;
  manager: string | null;
  jobLevel: JobLevel | null;
  startDate: Date | null;
  gender: Gender | null;
  birthDate: Date | null;
  role: CompanyRole;
  access: AccessStatus;
}

/** The company's active roster, with or without platform accounts. */
export async function listPeople(companyId: string, now: Date = new Date()): Promise<PersonRow[]> {
  const [employees, invitations] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        nationalId: true,
        title: true,
        jobLevel: true,
        startDate: true,
        gender: true,
        birthDate: true,
        department: { select: { name: true } },
        hub: { select: { name: true } },
        manager: { select: { name: true } },
        companyUser: { select: { role: true, isActive: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.invitation.findMany({ where: pendingInvitationsWhere(companyId, now), select: { email: true, role: true } }),
  ]);

  // Invitations are by email: accepting one links the account to the employee with that email
  const invitationByEmail = new Map(invitations.map((i) => [i.email.toLowerCase(), i]));
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    nationalId: e.nationalId,
    title: e.title,
    department: e.department?.name ?? null,
    hub: e.hub?.name ?? null,
    manager: e.manager?.name ?? null,
    jobLevel: e.jobLevel,
    startDate: e.startDate,
    gender: e.gender,
    birthDate: e.birthDate,
    ...rosterAccess(e.companyUser, invitationByEmail.get(e.email.toLowerCase())),
  }));
}

/** The invitation waiting for this email in the company, if any. */
export async function findPendingInvitation(companyId: string, email: string, now: Date = new Date()) {
  return prisma.invitation.findFirst({
    where: { ...pendingInvitationsWhere(companyId, now), email: { equals: email, mode: "insensitive" } },
    select: { role: true, expiresAt: true },
  });
}
