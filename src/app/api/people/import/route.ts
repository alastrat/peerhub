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

    // Check if user with this email already exists in the company
    const existingCompanyUser = await prisma.companyUser.findFirst({
      where: {
        companyId,
        user: { email: data.email },
      },
    });

    if (existingCompanyUser) {
      return NextResponse.json(
        { message: "User already exists in this company" },
        { status: 400 }
      );
    }

    // Find or create user
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

    // Find manager if provided
    let managerId: string | undefined;
    if (data.managerEmail) {
      const manager = await prisma.companyUser.findFirst({
        where: {
          companyId,
          user: { email: data.managerEmail },
        },
      });
      if (manager) {
        managerId = manager.id;
      }
    }

    // Determine role
    const role = data.role
      ? (data.role.toUpperCase() as "ADMIN" | "MANAGER" | "EMPLOYEE")
      : "EMPLOYEE";

    // Create company user
    const companyUser = await prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId,
        role,
        title: data.title || null,
        departmentId,
        managerId,
        employeeId: data.employeeId || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
      },
      include: {
        user: true,
        department: true,
      },
    });

    return NextResponse.json({
      message: "Employee imported successfully",
      data: companyUser,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { message: "Failed to import employee" },
      { status: 500 }
    );
  }
}
