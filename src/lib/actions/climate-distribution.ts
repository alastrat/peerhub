"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { SurveyDistribution } from "@prisma/client";

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

export async function distributeSurvey(input: {
  surveyId: string;
  targetType: "ALL" | "HUB" | "DEPARTMENT" | "TEAM" | "CUSTOM";
  targetIds?: string[];
  dueDate: Date;
}): Promise<ActionResult<SurveyDistribution>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: input.surveyId, companyId },
    });
    if (!survey) {
      return { success: false, error: "Survey not found" };
    }

    // Resolve target employees
    let employeeIds: string[] = [];

    if (input.targetType === "ALL") {
      const employees = await prisma.employee.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    } else if (input.targetType === "HUB") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one hub" };
      }
      const employees = await prisma.employee.findMany({
        where: { companyId, isActive: true, hubId: { in: input.targetIds } },
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    } else if (input.targetType === "DEPARTMENT") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one department" };
      }
      const employees = await prisma.employee.findMany({
        where: { companyId, isActive: true, departmentId: { in: input.targetIds } },
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    } else if (input.targetType === "TEAM") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one team" };
      }
      // Resolve ALL team members regardless of their primary department (cross-dept)
      const members = await prisma.teamMember.findMany({
        where: {
          team: { companyId, id: { in: input.targetIds } },
          employee: { isActive: true },
        },
        select: { employeeId: true },
      });
      employeeIds = [...new Set(members.map((m) => m.employeeId))];
    } else if (input.targetType === "CUSTOM") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one employee" };
      }
      employeeIds = input.targetIds;
    }

    if (employeeIds.length === 0) {
      return { success: false, error: "No employees found for the selected target" };
    }

    // Create distribution and response stubs
    const distribution = await prisma.surveyDistribution.create({
      data: {
        surveyId: input.surveyId,
        targetType: input.targetType,
        targetIds: input.targetIds || [],
        dueDate: input.dueDate,
        sentAt: new Date(),
        responses: {
          create: employeeIds.map((employeeId) => ({
            employeeId: survey.isAnonymous ? null : employeeId,
          })),
        },
      },
    });

    // Set survey to active
    if (survey.status === "DRAFT") {
      await prisma.climateSurvey.update({
        where: { id: input.surveyId },
        data: { status: "ACTIVE" },
      });
    }

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${input.surveyId}`);
    return { success: true, data: distribution };
  } catch (error) {
    console.error("Failed to distribute survey:", error);
    return { success: false, error: "Failed to distribute survey" };
  }
}

export async function closeSurvey(surveyId: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!survey) {
      return { success: false, error: "Survey not found" };
    }
    if (survey.status !== "ACTIVE") {
      return { success: false, error: "Only active surveys can be closed" };
    }

    await prisma.climateSurvey.update({
      where: { id: surveyId },
      data: { status: "CLOSED" },
    });

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to close survey",
    };
  }
}
