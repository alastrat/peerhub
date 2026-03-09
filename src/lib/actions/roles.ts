"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import {
  SYSTEM_ROLE_DEFAULTS,
  ALL_PERMISSION_KEYS,
  type PermissionLevel,
  type PermissionKey,
  type PermissionsMap,
} from "@/lib/permissions/constants";

async function requireCompanyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) throw new Error("Unauthorized");
  const companyId = session.companyUser?.companyId;
  if (!companyId) throw new Error("No active company");
  return { session, companyId, isSuperAdmin };
}

export async function ensureSystemRoles(companyId: string) {
  const existing = await prisma.companyRoleConfig.findMany({
    where: { companyId, isSystem: true },
  });

  const existingSlugs = new Set(existing.map((r) => r.slug));
  const entries = Object.entries(SYSTEM_ROLE_DEFAULTS) as [
    string,
    (typeof SYSTEM_ROLE_DEFAULTS)[string],
  ][];

  for (const [slug, def] of entries) {
    if (!existingSlugs.has(slug)) {
      const baseRole =
        slug === "admin"
          ? "ADMIN"
          : slug === "manager"
            ? "MANAGER"
            : "EMPLOYEE";
      await prisma.companyRoleConfig.create({
        data: {
          companyId,
          slug,
          name: def.name,
          description: def.description,
          baseRole,
          isSystem: true,
          permissions: def.permissions as Record<string, string>,
          color: def.color,
          order: slug === "admin" ? 0 : slug === "manager" ? 1 : 2,
        },
      });
    }
  }
}

export async function getCompanyRoles(companyId: string) {
  await ensureSystemRoles(companyId);

  return prisma.companyRoleConfig.findMany({
    where: { companyId },
    include: { _count: { select: { members: true } } },
    orderBy: { order: "asc" },
  });
}

export async function createRole(input: {
  name: string;
  description?: string;
  color?: string;
  cloneFromId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    if (!slug) {
      return { success: false, error: "Invalid role name" };
    }

    const existing = await prisma.companyRoleConfig.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });
    if (existing) {
      return { success: false, error: "A role with this name already exists" };
    }

    let permissions: Record<string, string> = {};
    if (input.cloneFromId) {
      const source = await prisma.companyRoleConfig.findUnique({
        where: { id: input.cloneFromId },
      });
      if (source && source.companyId === companyId) {
        permissions = source.permissions as Record<string, string>;
      }
    } else {
      // Default: all off
      for (const key of ALL_PERMISSION_KEYS) {
        permissions[key] = "off";
      }
    }

    const maxOrder = await prisma.companyRoleConfig.aggregate({
      where: { companyId },
      _max: { order: true },
    });

    const role = await prisma.companyRoleConfig.create({
      data: {
        companyId,
        slug,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        color: input.color || "#6b7280",
        isSystem: false,
        baseRole: null,
        permissions,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    revalidatePath("/settings/company/roles");
    return { success: true, data: { id: role.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create role",
    };
  }
}

export async function updateRolePermissions(input: {
  roleId: string;
  permissions: Record<string, string>;
}): Promise<ActionResult> {
  try {
    const { companyId, isSuperAdmin } = await requireCompanyAdmin();

    const role = await prisma.companyRoleConfig.findUnique({
      where: { id: input.roleId },
    });
    if (!role) return { success: false, error: "Role not found" };
    if (role.companyId !== companyId) {
      return { success: false, error: "Role does not belong to this company" };
    }
    if (role.isSystem && !isSuperAdmin) {
      return { success: false, error: "Only super admins can edit system roles" };
    }

    // Validate permission keys and levels
    const validLevels = new Set(["off", "read", "write"]);
    const validKeys = new Set(ALL_PERMISSION_KEYS as string[]);
    const cleaned: Record<string, string> = {};

    for (const [key, level] of Object.entries(input.permissions)) {
      if (validKeys.has(key) && validLevels.has(level)) {
        cleaned[key] = level;
      }
    }

    // Admin system role must keep company.roles at write
    if (role.isSystem && role.baseRole === "ADMIN") {
      cleaned["company.roles"] = "write";
    }

    await prisma.companyRoleConfig.update({
      where: { id: input.roleId },
      data: { permissions: cleaned },
    });

    revalidatePath("/settings/company/roles");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update permissions",
    };
  }
}

export async function updateRoleDetails(input: {
  roleId: string;
  name?: string;
  description?: string;
  color?: string;
}): Promise<ActionResult> {
  try {
    const { companyId, isSuperAdmin } = await requireCompanyAdmin();

    const role = await prisma.companyRoleConfig.findUnique({
      where: { id: input.roleId },
    });
    if (!role) return { success: false, error: "Role not found" };
    if (role.companyId !== companyId) {
      return { success: false, error: "Role does not belong to this company" };
    }
    if (role.isSystem && !isSuperAdmin) {
      return { success: false, error: "Only super admins can edit system roles" };
    }

    await prisma.companyRoleConfig.update({
      where: { id: input.roleId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description.trim() || null,
        }),
        ...(input.color !== undefined && { color: input.color }),
      },
    });

    revalidatePath("/settings/company/roles");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

export async function deleteRole(input: {
  roleId: string;
  reassignToId: string;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const role = await prisma.companyRoleConfig.findUnique({
      where: { id: input.roleId },
      include: { _count: { select: { members: true } } },
    });
    if (!role) return { success: false, error: "Role not found" };
    if (role.companyId !== companyId) {
      return { success: false, error: "Role does not belong to this company" };
    }
    if (role.isSystem) {
      return { success: false, error: "Cannot delete system roles" };
    }

    const target = await prisma.companyRoleConfig.findUnique({
      where: { id: input.reassignToId },
    });
    if (!target || target.companyId !== companyId) {
      return { success: false, error: "Target role not found" };
    }

    // Reassign members
    if (role._count.members > 0) {
      await prisma.companyUser.updateMany({
        where: { roleConfigId: input.roleId },
        data: {
          roleConfigId: input.reassignToId,
          role: target.baseRole || "EMPLOYEE",
        },
      });
    }

    await prisma.companyRoleConfig.delete({ where: { id: input.roleId } });

    revalidatePath("/settings/company/roles");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete role",
    };
  }
}
