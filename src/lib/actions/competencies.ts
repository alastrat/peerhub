"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Competency } from "@prisma/client";

// Note: categories are defined in the client component directly
// since "use server" modules can only export async functions

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

export async function createCompetency(input: {
  name: string;
  description?: string;
  category?: string;
}): Promise<ActionResult<Competency>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const existing = await prisma.competency.findFirst({
      where: { companyId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "A competency with this name already exists" };
    }

    const competency = await prisma.competency.create({
      data: {
        companyId,
        name,
        description: input.description?.trim() || null,
        category: input.category || null,
      },
    });

    revalidatePath("/settings/company/competencies");
    revalidatePath("/templates");
    return { success: true, data: competency };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create competency",
    };
  }
}

export async function updateCompetency(input: {
  id: string;
  name: string;
  description?: string;
  category?: string;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const competency = await prisma.competency.findUnique({ where: { id: input.id } });
    if (!competency || competency.companyId !== companyId) {
      return { success: false, error: "Competency not found" };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const duplicate = await prisma.competency.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: "insensitive" },
        id: { not: input.id },
      },
    });
    if (duplicate) {
      return { success: false, error: "A competency with this name already exists" };
    }

    await prisma.competency.update({
      where: { id: input.id },
      data: {
        name,
        description: input.description?.trim() || null,
        category: input.category || null,
      },
    });

    revalidatePath("/settings/company/competencies");
    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update competency",
    };
  }
}

export async function deleteCompetency(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const competency = await prisma.competency.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!competency || competency.companyId !== companyId) {
      return { success: false, error: "Competency not found" };
    }

    if (competency._count.questions > 0) {
      return {
        success: false,
        error: `Cannot delete: used by ${competency._count.questions} template question${competency._count.questions !== 1 ? "s" : ""}. Remove the competency from those questions first.`,
      };
    }

    await prisma.competency.delete({ where: { id } });

    revalidatePath("/settings/company/competencies");
    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete competency",
    };
  }
}

