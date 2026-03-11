import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { csvImportRowSchema } from "@/lib/validations/user";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.companyUser.companyId;
    const body = await request.json();

    // Validate input
    const parsed = csvImportRowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid data" },
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
        { message: "Employee already exists in this company" },
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
        startDate: data.startDate ? new Date(data.startDate) : null,
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
      message: "Employee imported successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: "Failed to import employee" },
      { status: 500 }
    );
  }
}
