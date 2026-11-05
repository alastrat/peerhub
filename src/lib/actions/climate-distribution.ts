"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import { sendBulkEmails } from "@/lib/email/resend";
import { buildSurveyInvitationEmail } from "@/lib/email/portal-templates";
import { toSupportedLocale } from "@/i18n/translator";
import { actionError, getActionErrors, unexpectedActionError } from "@/lib/auth/action-locale";
import type { ActionResult } from "@/types";
import type { SurveyDistribution } from "@prisma/client";
import { finishSurvey } from "@/lib/climate/survey-finish";

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
      return actionError("survey_not_found");
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
        return actionError("select_hub");
      }
      targetEmployees = await prisma.employee.findMany({
        where: { companyId, isActive: true, hubId: { in: input.targetIds } },
        select: { id: true, name: true, email: true },
      });
    } else if (input.targetType === "DEPARTMENT") {
      if (!input.targetIds?.length) {
        return actionError("select_department");
      }
      targetEmployees = await prisma.employee.findMany({
        where: { companyId, isActive: true, departmentId: { in: input.targetIds } },
        select: { id: true, name: true, email: true },
      });
    } else if (input.targetType === "TEAM") {
      if (!input.targetIds?.length) {
        return actionError("select_team");
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
        return actionError("select_employee");
      }
      targetEmployees = await prisma.employee.findMany({
        where: { id: { in: input.targetIds }, companyId, isActive: true },
        select: { id: true, name: true, email: true },
      });
    }

    if (targetEmployees.length === 0) {
      return actionError("no_employees");
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

    // Send invitation emails (best-effort — don't fail the distribution),
    // written in the company's language
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { locale: true } });
    const locale = toSupportedLocale(company?.locale);
    const dueDateLabel = input.dueDate.toLocaleDateString(locale === "en" ? "en-US" : "es-CO", {
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
        locale,
      });
      return { to: emp.email, subject, html, text };
    });

    const emailResult = await sendBulkEmails(emails);

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${input.surveyId}`);

    if (emailResult.failureCount > 0) {
      const t = await getActionErrors();
      return {
        success: true,
        data: distribution,
        warning: t("emails_failed", { count: targetEmployees.length, failed: emailResult.failureCount }),
      };
    }

    return { success: true, data: distribution };
  } catch (error) {
    console.error("Failed to distribute survey:", error);
    return unexpectedActionError(error, "failed_distribute");
  }
}

export async function closeSurvey(surveyId: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!survey) {
      return actionError("survey_not_found");
    }
    if (survey.status !== "ACTIVE") {
      return actionError("close_only_active");
    }

    // Same as closing on the end date or once everyone answered: impact of
    // earlier plans, results to the leaders and the report to the admins
    await finishSurvey(surveyId, companyId);

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    return unexpectedActionError(error, "failed_close", { withDetail: true });
  }
}

export async function reactivateSurvey(surveyId: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!survey) {
      return actionError("survey_not_found");
    }
    if (survey.status !== "CLOSED") {
      return actionError("reactivate_only_closed");
    }

    await prisma.climateSurvey.update({
      where: { id: surveyId },
      // Closing it again sends the admins an updated report; leaders keep their links
      data: { status: "ACTIVE", closingReportSentAt: null },
    });

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    return unexpectedActionError(error, "failed_reactivate", { withDetail: true });
  }
}
