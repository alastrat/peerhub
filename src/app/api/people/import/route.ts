import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { csvImportRowSchema, type CSVImportRow } from "@/lib/validations/user";
import { isValidBirthDate, parseGender } from "@/lib/constants/demographics";
import { parseJobLevel } from "@/lib/constants/job-levels";
import { normalizeNationalId } from "@/lib/utils/employee-import";
import { generateInviteToken, getExpiryDate } from "@/lib/utils";
import { sendInvitationEmail } from "@/lib/email/templates";
import { getTranslator } from "@/i18n/translator";
import type { CompanyRole, Employee } from "@prisma/client";

// Kultiva's format points at the leader by cédula, falling back to the name;
// the old CSV template by email
async function findManagerId(companyId: string, data: CSVImportRow): Promise<string | undefined> {
  if (data.managerNationalId) {
    const manager = await prisma.employee.findUnique({
      where: { companyId_nationalId: { companyId, nationalId: normalizeNationalId(data.managerNationalId) } },
      select: { id: true },
    });
    if (manager) return manager.id;
  }
  if (data.managerEmail) {
    const manager = await prisma.employee.findFirst({
      where: { companyId, email: { equals: data.managerEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (manager) return manager.id;
  }
  if (data.managerName) {
    // Only an unambiguous name: with two namesakes we can't tell which one leads
    const matches = await prisma.employee.findMany({
      where: { companyId, name: { equals: data.managerName.trim(), mode: "insensitive" } },
      select: { id: true },
      take: 2,
    });
    if (matches.length === 1) return matches[0].id;
  }
  return undefined;
}

/**
 * Invite an imported employee to the platform (a fresh link, even if an older
 * invitation exists). Accepting it links their account to this Employee by
 * email. A brand-new invitation whose email can't be delivered is removed,
 * since nobody could reach its link; the error is rethrown.
 */
async function inviteImportedEmployee(
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

export async function POST(request: NextRequest) {
  // Messages are shown per row in the import wizard, in the company's language
  let t = getTranslator(null, "people_import.api");
  try {
    const session = await auth();
    t = getTranslator(session?.companyUser?.locale, "people_import.api");
    if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
      return NextResponse.json({ message: t("unauthorized") }, { status: 401 });
    }

    const companyId = session.companyUser.companyId;
    const body = await request.json();

    // Validate input
    const parsed = csvImportRowSchema.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join(".");
      return NextResponse.json(
        { message: field ? t("invalid_field", { field }) : t("invalid_data") },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const nationalId = data.nationalId ? normalizeNationalId(data.nationalId) : null;

    // Check if employee with this email already exists in the company
    const existingEmployee = await prisma.employee.findFirst({
      where: { companyId, email: { equals: data.email, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { message: t("already_exists") },
        { status: 400 }
      );
    }

    if (nationalId) {
      const sameNationalId = await prisma.employee.findUnique({
        where: { companyId_nationalId: { companyId, nationalId } },
        select: { id: true },
      });
      if (sameNationalId) {
        return NextResponse.json({ message: t("already_exists_national_id", { value: nationalId }) }, { status: 400 });
      }
    }

    const jobLevel = data.jobLevel ? parseJobLevel(data.jobLevel) : null;
    if (data.jobLevel && !jobLevel) {
      return NextResponse.json({ message: t("unknown_job_level", { value: data.jobLevel }) }, { status: 400 });
    }

    // Find or create department if provided
    let departmentId: string | undefined;
    if (data.department) {
      const department = await prisma.department.findFirst({
        where: {
          companyId,
          name: { equals: data.department, mode: "insensitive" },
        },
      });

      if (department) {
        departmentId = department.id;
      } else {
        // Create new department
        const newDepartment = await prisma.department.create({
          data: {
            name: data.department,
            companyId,
          },
        });
        departmentId = newDepartment.id;
      }
    }

    // "Sede": find or create the hub, like departments
    let hubId: string | undefined;
    if (data.hub) {
      const hub =
        (await prisma.hub.findFirst({
          where: { companyId, name: { equals: data.hub, mode: "insensitive" } },
          select: { id: true },
        })) ?? (await prisma.hub.create({ data: { name: data.hub, companyId }, select: { id: true } }));
      hubId = hub.id;
    }

    // The wizard imports leaders before their reports, so a leader in the
    // same file is already here. One who isn't found leaves the row without a
    // leader and the wizard says so.
    const managerRef = data.managerNationalId || data.managerEmail || data.managerName;
    const managerId = managerRef ? await findManagerId(companyId, data) : undefined;

    // Optional demographics (climate segments). Unknown values are rejected
    // so a typo doesn't silently drop someone out of every segment.
    const gender = data.gender ? parseGender(data.gender) : null;
    if (data.gender && !gender) {
      return NextResponse.json({ message: t("unknown_gender", { value: data.gender }) }, { status: 400 });
    }
    const birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (birthDate && !isValidBirthDate(birthDate)) {
      return NextResponse.json({ message: t("invalid_birth_date", { value: data.birthDate! }) }, { status: 400 });
    }
    const startDate = data.startDate ? new Date(data.startDate) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ message: t("invalid_start_date", { value: data.startDate! }) }, { status: 400 });
    }

    // Create the Employee record
    const employee = await prisma.employee.create({
      data: {
        companyId,
        email: data.email,
        name: data.name,
        title: data.title || null,
        employeeCode: data.employeeCode || null,
        nationalId,
        jobLevel,
        departmentId,
        hubId,
        managerId,
        startDate,
        gender,
        birthDate,
      },
      include: {
        department: true,
      },
    });

    const role = (data.role?.toUpperCase() ?? "MEMBER") as CompanyRole;
    const warnings: string[] = [];
    if (managerRef && !managerId) warnings.push(t("manager_not_found", { manager: data.managerName || managerRef }));

    // With the wizard's "send invitations" box, platform access comes from the
    // invitation (with the file's role, if any). Without it, only a role
    // column grants access, directly and without any email.
    let invited = false;
    if (data.invite) {
      try {
        await inviteImportedEmployee(employee, role, session.user?.name);
        invited = true;
      } catch (error) {
        console.error("Import invitation failed:", error);
        warnings.push(t("invite_failed"));
      }
    } else if (data.role) {
      let user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: data.email,
            name: data.name,
          },
        });
      }

      await prisma.companyUser.create({
        data: {
          userId: user.id,
          companyId,
          role,
          employeeId: employee.id,
        },
      });
    }

    return NextResponse.json({
      message: t("imported"),
      data: employee,
      invited,
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: t("failed") },
      { status: 500 }
    );
  }
}
