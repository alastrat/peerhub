"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { sendBulkEmails } from "@/lib/email/resend";
import { buildSurveyInvitationEmail } from "@/lib/email/portal-templates";
import type { ActionResult } from "@/types";
import type { SurveyDistribution } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

    // Resolve target employees (fetch name + email for notifications)
    let targetEmployees: { id: string; name: string; email: string }[] = [];

    if (input.targetType === "ALL") {
      targetEmployees = await prisma.employee.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, email: true },
      });
    } else if (input.targetType === "HUB") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one hub" };
      }
      targetEmployees = await prisma.employee.findMany({
        where: { companyId, isActive: true, hubId: { in: input.targetIds } },
        select: { id: true, name: true, email: true },
      });
    } else if (input.targetType === "DEPARTMENT") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one department" };
      }
      targetEmployees = await prisma.employee.findMany({
        where: { companyId, isActive: true, departmentId: { in: input.targetIds } },
        select: { id: true, name: true, email: true },
      });
    } else if (input.targetType === "TEAM") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one team" };
      }
      const members = await prisma.teamMember.findMany({
        where: {
          team: { companyId, id: { in: input.targetIds } },
          employee: { isActive: true },
        },
        select: {
          employee: { select: { id: true, name: true, email: true } },
        },
      });
      const seen = new Set<string>();
      targetEmployees = members
        .map((m) => m.employee)
        .filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
    } else if (input.targetType === "CUSTOM") {
      if (!input.targetIds?.length) {
        return { success: false, error: "Select at least one employee" };
      }
      targetEmployees = await prisma.employee.findMany({
        where: { id: { in: input.targetIds }, companyId, isActive: true },
        select: { id: true, name: true, email: true },
      });
    }

    if (targetEmployees.length === 0) {
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
          create: targetEmployees.map((emp) => ({
            employeeId: emp.id,
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

    // Send invitation emails (best-effort — don't fail the distribution)
    const dueDateLabel = input.dueDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const surveyPath = `/portal/climate-survey/${distribution.id}`;
    const surveyUrl = `${APP_URL}/portal?redirect=${encodeURIComponent(surveyPath)}`;

    const emails = targetEmployees.map((emp) => {
      const { subject, html, text } = buildSurveyInvitationEmail({
        employeeName: emp.name,
        surveyName: survey.name,
        dueDate: dueDateLabel,
        surveyUrl,
        isAnonymous: survey.isAnonymous,
      });
      return { to: emp.email, subject, html, text };
    });

    const emailResult = await sendBulkEmails(emails);

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${input.surveyId}`);

    if (emailResult.failureCount > 0) {
      return {
        success: true,
        data: distribution,
        warning: `Survey sent to ${targetEmployees.length} employees. ${emailResult.failureCount} email notification(s) failed to deliver.`,
      };
    }

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

export async function reactivateSurvey(surveyId: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!survey) {
      return { success: false, error: "Survey not found" };
    }
    if (survey.status !== "CLOSED") {
      return { success: false, error: "Only closed surveys can be reactivated" };
    }

    await prisma.climateSurvey.update({
      where: { id: surveyId },
      data: { status: "ACTIVE" },
    });

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reactivate survey",
    };
  }
}
