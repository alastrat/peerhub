import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { csvImportRowSchema } from "@/lib/validations/user";
import { isValidBirthDate, parseGender } from "@/lib/constants/demographics";
import { getTranslator } from "@/i18n/translator";

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

    // Check if employee with this email already exists in the company
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        companyId_email: { companyId, email: data.email },
      },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { message: t("already_exists") },
        { status: 400 }
      );
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

    // Find manager if provided (by email in the Employee table)
    let managerId: string | undefined;
    if (data.managerEmail) {
      const manager = await prisma.employee.findUnique({
        where: {
          companyId_email: { companyId, email: data.managerEmail },
        },
      });
      if (manager) {
        managerId = manager.id;
      }
    }

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
        departmentId,
        managerId,
        startDate,
        gender,
        birthDate,
      },
      include: {
        department: true,
      },
    });

    // Optionally create User + CompanyUser for platform access
    if (data.role) {
      const role = data.role.toUpperCase() as "ADMIN" | "MANAGER" | "MEMBER";
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
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: t("failed") },
      { status: 500 }
    );
  }
}
