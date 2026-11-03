"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { getPortalSession } from "@/lib/auth/portal-session";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import type { ActionResult } from "@/types";
import { getQuestionScale } from "@/lib/constants/climate-scales";
import { buildSegmentSnapshot } from "@/lib/utils/climate-segments";

type AnswerInput = { questionId: string; ratingValue?: number; textValue?: string };

/**
 * Reject answers to questions outside the survey and ratings outside the
 * question's scale. Returns an error message, or null when all are valid.
 */
function validateAnswers(
  questions: { id: string; type: string; config: unknown }[],
  answers: AnswerInput[],
): string | null {
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) return "Answer to a question that is not part of this survey";
    if (a.ratingValue == null) continue;
    const scale = getQuestionScale(q);
    if (!scale || !Number.isInteger(a.ratingValue) || a.ratingValue < scale.min || a.ratingValue > scale.max) {
      return "Answer is outside the question's scale";
    }
  }
  return null;
}

async function requireEmployee() {
  // Portal session takes precedence (employees signing in through /portal)
  const portalSession = await getPortalSession();
  if (portalSession) {
    const employee = await prisma.employee.findUnique({
      where: { id: portalSession.employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new Error("Employee not found");
    return { companyId: employee.companyId, employeeId: employee.id };
  }

  // Fallback: dashboard session (admin/manager also in the company)
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const companyId = session.companyUser?.companyId;
  if (!companyId) throw new Error("No active company");

  const companyUser = await prisma.companyUser.findFirst({
    where: { userId: session.user.id, companyId, isActive: true },
    include: { employee: true },
  });
  if (!companyUser?.employee) throw new Error("Employee not found");

  return { companyId, employeeId: companyUser.employee.id };
}

export async function saveSurveyDraft(input: {
  distributionId: string;
  answers: { questionId: string; ratingValue?: number; textValue?: string }[];
}): Promise<ActionResult> {
  try {
    const { employeeId, companyId } = await requireEmployee();

    const distribution = await prisma.surveyDistribution.findUnique({
      where: { id: input.distributionId },
      include: { survey: { select: { companyId: true, questions: { select: { id: true, type: true, config: true } } } } },
    });
    if (!distribution || distribution.survey.companyId !== companyId) {
      return { success: false, error: "Survey not found" };
    }
    const invalid = validateAnswers(distribution.survey.questions, input.answers);
    if (invalid) return { success: false, error: invalid };

    // Find or create response
    let response = await prisma.surveyResponse.findFirst({
      where: { distributionId: input.distributionId, employeeId },
    });

    if (!response) {
      response = await prisma.surveyResponse.create({
        data: {
          distributionId: input.distributionId,
          employeeId,
        },
      });
    }

    if (response.isComplete) {
      return { success: false, error: "Survey already submitted" };
    }

    // Upsert answers
    for (const answer of input.answers) {
      await prisma.surveyAnswer.upsert({
        where: {
          responseId_questionId: {
            responseId: response.id,
            questionId: answer.questionId,
          },
        },
        create: {
          responseId: response.id,
          questionId: answer.questionId,
          ratingValue: answer.ratingValue ?? null,
          textValue: answer.textValue ?? null,
        },
        update: {
          ratingValue: answer.ratingValue ?? null,
          textValue: answer.textValue ?? null,
        },
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save draft",
    };
  }
}

export async function submitSurveyResponse(input: {
  distributionId: string;
  answers: { questionId: string; ratingValue?: number; textValue?: string }[];
}): Promise<ActionResult> {
  try {
    const { employeeId, companyId } = await requireEmployee();

    // Get the distribution with survey questions
    const distribution = await prisma.surveyDistribution.findUnique({
      where: { id: input.distributionId },
      include: {
        survey: {
          include: { questions: true },
        },
      },
    });

    if (!distribution || distribution.survey.companyId !== companyId) {
      return { success: false, error: "Survey not found" };
    }

    const invalid = validateAnswers(distribution.survey.questions, input.answers);
    if (invalid) return { success: false, error: invalid };

    // Validate required questions
    const requiredQuestionIds = distribution.survey.questions.filter((q) => q.isRequired).map((q) => q.id);
    const answeredQuestionIds = input.answers
      .filter((a) => a.ratingValue != null || (a.textValue && a.textValue.trim()))
      .map((a) => a.questionId);

    const missingRequired = requiredQuestionIds.filter(
      (qId) => !answeredQuestionIds.includes(qId)
    );
    if (missingRequired.length > 0) {
      return { success: false, error: `Please answer all required questions (${missingRequired.length} remaining)` };
    }

    // Find or create response
    let response = await prisma.surveyResponse.findFirst({
      where: { distributionId: input.distributionId, employeeId },
    });

    if (!response) {
      response = await prisma.surveyResponse.create({
        data: {
          distributionId: input.distributionId,
          employeeId,
        },
      });
    }

    if (response.isComplete) {
      return { success: false, error: "Survey already submitted" };
    }

    const employeeForSnapshot = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        departmentId: true,
        hubId: true,
        managerId: true,
        teamMemberships: { select: { teamId: true } },
      },
    });

    // Upsert all answers and mark complete
    await prisma.$transaction([
      ...input.answers.map((answer) =>
        prisma.surveyAnswer.upsert({
          where: {
            responseId_questionId: {
              responseId: response!.id,
              questionId: answer.questionId,
            },
          },
          create: {
            responseId: response!.id,
            questionId: answer.questionId,
            ratingValue: answer.ratingValue ?? null,
            textValue: answer.textValue ?? null,
          },
          update: {
            ratingValue: answer.ratingValue ?? null,
            textValue: answer.textValue ?? null,
          },
        })
      ),
      prisma.surveyResponse.update({
        where: { id: response.id },
        data: {
          isComplete: true,
          submittedAt: new Date(),
          // Freeze where the respondent sat in the org at submission
          segmentSnapshot: employeeForSnapshot
            ? (buildSegmentSnapshot(employeeForSnapshot) as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      }),
    ]);

    revalidatePath("/my-surveys");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit survey",
    };
  }
}
