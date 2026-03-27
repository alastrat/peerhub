"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { TeamRole } from "@prisma/client";

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

export async function createTeam(input: {
  name: string;
  description?: string;
  hubId?: string;
  departmentId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const existing = await prisma.team.findFirst({
      where: { companyId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return { success: false, error: "A team with this name already exists" };
    }

    // Validate hub belongs to company if provided
    if (input.hubId) {
      const hub = await prisma.hub.findUnique({ where: { id: input.hubId } });
      if (!hub || hub.companyId !== companyId) {
        return { success: false, error: "Hub not found" };
      }
    }

    // Validate department belongs to company if provided
    if (input.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
      if (!dept || dept.companyId !== companyId) {
        return { success: false, error: "Department not found" };
      }
    }

    const team = await prisma.team.create({
      data: {
        companyId,
        name,
        description: input.description?.trim() || null,
        hubId: input.hubId || null,
        departmentId: input.departmentId || null,
      },
    });

    revalidatePath("/settings/company/teams");
    return { success: true, data: { id: team.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create team",
    };
  }
}

export async function updateTeam(input: {
  id: string;
  name: string;
  description?: string | null;
  hubId?: string | null;
  departmentId?: string | null;
}): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const team = await prisma.team.findUnique({ where: { id: input.id } });
    if (!team || team.companyId !== companyId) {
      return { success: false, error: "Team not found" };
    }

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const duplicate = await prisma.team.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: "insensitive" },
        id: { not: input.id },
      },
    });
    if (duplicate) {
      return { success: false, error: "A team with this name already exists" };
    }

    await prisma.team.update({
      where: { id: input.id },
      data: {
        name,
        description: input.description?.trim() ?? null,
        hubId: input.hubId ?? null,
        departmentId: input.departmentId ?? null,
      },
    });

    revalidatePath("/settings/company/teams");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update team",
    };
  }
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const team = await prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!team || team.companyId !== companyId) {
      return { success: false, error: "Team not found" };
    }

    if (team._count.members > 0) {
      return {
        success: false,
        error: `Cannot delete: ${team._count.members} member${team._count.members !== 1 ? "s" : ""} still in team`,
      };
    }

    await prisma.team.delete({ where: { id } });

    revalidatePath("/settings/company/teams");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete team",
    };
  }
}

export async function addTeamMember(
  teamId: string,
  employeeId: string,
  role: TeamRole = "MEMBER"
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) {
      return { success: false, error: "Team not found" };
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.companyId !== companyId) {
      return { success: false, error: "Employee not found" };
    }

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_employeeId: { teamId, employeeId } },
    });
    if (existing) {
      return { success: false, error: "Employee is already a member of this team" };
    }

    const member = await prisma.teamMember.create({
      data: { teamId, employeeId, role },
    });

    revalidatePath("/settings/company/teams");
    return { success: true, data: { id: member.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add team member",
    };
  }
}

export async function removeTeamMember(
  teamId: string,
  employeeId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) {
      return { success: false, error: "Team not found" };
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_employeeId: { teamId, employeeId } },
    });
    if (!membership) {
      return { success: false, error: "Member not found in this team" };
    }

    await prisma.teamMember.delete({
      where: { teamId_employeeId: { teamId, employeeId } },
    });

    revalidatePath("/settings/company/teams");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove team member",
    };
  }
}

export async function updateTeamMemberRole(
  teamId: string,
  employeeId: string,
  role: TeamRole
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) {
      return { success: false, error: "Team not found" };
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_employeeId: { teamId, employeeId } },
    });
    if (!membership) {
      return { success: false, error: "Member not found in this team" };
    }

    await prisma.teamMember.update({
      where: { teamId_employeeId: { teamId, employeeId } },
      data: { role },
    });

    revalidatePath("/settings/company/teams");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update member role",
    };
  }
}

export async function getTeams() {
  const session = await auth();
  if (!session?.companyUser) throw new Error("Unauthorized");

  return prisma.team.findMany({
    where: { companyId: session.companyUser.companyId },
    include: {
      department: { select: { id: true, name: true } },
      hub: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamWithMembers(teamId: string) {
  const session = await auth();
  if (!session?.companyUser) throw new Error("Unauthorized");

  return prisma.team.findFirst({
    where: { id: teamId, companyId: session.companyUser.companyId },
    include: {
      department: { select: { id: true, name: true } },
      hub: { select: { id: true, name: true } },
      members: {
        include: {
          employee: {
            select: { id: true, name: true, email: true, title: true, department: { select: { name: true } } },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  });
}
