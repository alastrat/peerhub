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

export async function createHub(input: {
  name: string;
  description?: string;
  address?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    // Check featureHubs is enabled
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { featureHubs: true },
    });
    if (!company?.featureHubs) {
      return { success: false, error: "Hub management is not enabled for this company" };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const existing = await prisma.hub.findFirst({
      where: { companyId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "A hub with this name already exists" };
    }

    const hub = await prisma.hub.create({
      data: {
        companyId,
        name,
        description: input.description?.trim() || null,
        address: input.address?.trim() || null,
      },
    });

    revalidatePath("/settings/company/hubs");
    return { success: true, data: { id: hub.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create hub",
    };
  }
}

export async function updateHub(input: {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const hub = await prisma.hub.findUnique({ where: { id: input.id } });
    if (!hub || hub.companyId !== companyId) {
      return { success: false, error: "Hub not found" };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const duplicate = await prisma.hub.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: "insensitive" },
        id: { not: input.id },
      },
    });
    if (duplicate) {
      return { success: false, error: "A hub with this name already exists" };
    }

    await prisma.hub.update({
      where: { id: input.id },
      data: {
        name,
        description: input.description?.trim() ?? null,
        address: input.address?.trim() ?? null,
      },
    });

    revalidatePath("/settings/company/hubs");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update hub",
    };
  }
}

export async function deleteHub(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const hub = await prisma.hub.findUnique({
      where: { id },
      include: { _count: { select: { employees: true, teams: true } } },
    });
    if (!hub || hub.companyId !== companyId) {
      return { success: false, error: "Hub not found" };
    }

    if (hub.isDefault) {
      return { success: false, error: "Cannot delete the default hub" };
    }

    if (hub._count.employees > 0) {
      return {
        success: false,
        error: `Cannot delete: ${hub._count.employees} employee${hub._count.employees !== 1 ? "s" : ""} still assigned`,
      };
    }

    if (hub._count.teams > 0) {
      return {
        success: false,
        error: `Cannot delete: ${hub._count.teams} team${hub._count.teams !== 1 ? "s" : ""} still assigned`,
      };
    }

    await prisma.hub.delete({ where: { id } });

    revalidatePath("/settings/company/hubs");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete hub",
    };
  }
}

export async function getHubs() {
  const session = await auth();
  if (!session?.companyUser) throw new Error("Unauthorized");

  return prisma.hub.findMany({
    where: { companyId: session.companyUser.companyId },
    include: { _count: { select: { employees: true, teams: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}
