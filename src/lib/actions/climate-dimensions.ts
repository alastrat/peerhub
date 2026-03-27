"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ClimateDimension } from "@prisma/client";

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

export async function createDimension(input: {
  name: string;
  description?: string;
  icon?: string;
}): Promise<ActionResult<ClimateDimension>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const existing = await prisma.climateDimension.findFirst({
      where: { companyId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "A dimension with this name already exists" };
    }

    const dimension = await prisma.climateDimension.create({
      data: {
        companyId,
        name,
        description: input.description?.trim() || null,
        icon: input.icon || null,
      },
    });

    revalidatePath("/surveys/climate");
    revalidatePath("/settings/company/dimensions");
    return { success: true, data: dimension };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create dimension",
    };
  }
}

export async function updateDimension(input: {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const dimension = await prisma.climateDimension.findUnique({ where: { id: input.id } });
    if (!dimension || dimension.companyId !== companyId) {
      return { success: false, error: "Dimension not found" };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const duplicate = await prisma.climateDimension.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: "insensitive" },
        id: { not: input.id },
      },
    });
    if (duplicate) {
      return { success: false, error: "A dimension with this name already exists" };
    }

    await prisma.climateDimension.update({
      where: { id: input.id },
      data: {
        name,
        description: input.description?.trim() || null,
        icon: input.icon || null,
      },
    });

    revalidatePath("/surveys/climate");
    revalidatePath("/settings/company/dimensions");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update dimension",
    };
  }
}

export async function deleteDimension(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const dimension = await prisma.climateDimension.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!dimension || dimension.companyId !== companyId) {
      return { success: false, error: "Dimension not found" };
    }

    if (dimension._count.questions > 0) {
      return {
        success: false,
        error: `Cannot delete: used by ${dimension._count.questions} survey question${dimension._count.questions !== 1 ? "s" : ""}. Remove the dimension from those questions first.`,
      };
    }

    await prisma.climateDimension.delete({ where: { id } });

    revalidatePath("/surveys/climate");
    revalidatePath("/settings/company/dimensions");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete dimension",
    };
  }
}
