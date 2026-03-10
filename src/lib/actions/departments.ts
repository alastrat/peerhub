"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

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

export async function createDepartment(input: {
  name: string;
  description?: string;
  parentId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const existing = await prisma.department.findFirst({
      where: { companyId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "A department with this name already exists" };
    }

    if (input.parentId) {
      const parent = await prisma.department.findUnique({
        where: { id: input.parentId },
      });
      if (!parent || parent.companyId !== companyId) {
        return { success: false, error: "Parent department not found" };
      }
    }

    const dept = await prisma.department.create({
      data: {
        companyId,
        name,
        description: input.description?.trim() || null,
        parentId: input.parentId || null,
      },
    });

    revalidatePath("/settings/company/departments");
    return { success: true, data: { id: dept.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create department",
    };
  }
}

export async function updateDepartment(input: {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const dept = await prisma.department.findUnique({ where: { id: input.id } });
    if (!dept || dept.companyId !== companyId) {
      return { success: false, error: "Department not found" };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const duplicate = await prisma.department.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: "insensitive" },
        id: { not: input.id },
      },
    });
    if (duplicate) {
      return { success: false, error: "A department with this name already exists" };
    }

    if (input.parentId === input.id) {
      return { success: false, error: "A department cannot be its own parent" };
    }

    await prisma.department.update({
      where: { id: input.id },
      data: {
        name,
        description: input.description?.trim() || null,
        parentId: input.parentId ?? null,
      },
    });

    revalidatePath("/settings/company/departments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update department",
    };
  }
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { members: true, children: true } } },
    });
    if (!dept || dept.companyId !== companyId) {
      return { success: false, error: "Department not found" };
    }

    if (dept._count.members > 0) {
      return {
        success: false,
        error: `Cannot delete: ${dept._count.members} member${dept._count.members !== 1 ? "s" : ""} still assigned`,
      };
    }

    if (dept._count.children > 0) {
      return {
        success: false,
        error: `Cannot delete: has ${dept._count.children} sub-department${dept._count.children !== 1 ? "s" : ""}`,
      };
    }

    await prisma.department.delete({ where: { id } });

    revalidatePath("/settings/company/departments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete department",
    };
  }
}
