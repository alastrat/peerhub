"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { getPortalSession } from "@/lib/auth/portal-session";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { finishIfEveryoneAnswered } from "@/lib/climate/survey-finish";
import type { Prisma } from "@prisma/client";
import type { ActionResult } from "@/types";
import { getQuestionScale } from "@/lib/constants/climate-scales";
import { buildSegmentSnapshot } from "@/lib/utils/climate-segments";
import { actionError, unexpectedActionError } from "@/lib/auth/action-locale";

type AnswerInput = { questionId: string; ratingValue?: number; textValue?: string };

/**
 * Reject answers to questions outside the survey and ratings outside the
 * question's scale. Returns an `action_errors` key, or null when all are valid.
 */
function validateAnswers(
  questions: { id: string; type: string; config: unknown }[],
  answers: AnswerInput[],
): string | null {
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) return "answer_not_in_survey";
    if (a.ratingValue == null) continue;
    const scale = getQuestionScale(q);
    if (!scale || !Number.isInteger(a.ratingValue) || a.ratingValue < scale.min || a.ratingValue > scale.max) {
      return "answer_out_of_scale";
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
      return actionError("survey_not_found");
    }
    const invalid = validateAnswers(distribution.survey.questions, input.answers);
    if (invalid) return actionError(invalid);

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
      return actionError("already_submitted");
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
    return unexpectedActionError(error, "failed_save_draft");
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
      return actionError("survey_not_found");
    }

    const invalid = validateAnswers(distribution.survey.questions, input.answers);
    if (invalid) return actionError(invalid);

    // Validate required questions
    const requiredQuestionIds = distribution.survey.questions.filter((q) => q.isRequired).map((q) => q.id);
    const answeredQuestionIds = input.answers
      .filter((a) => a.ratingValue != null || (a.textValue && a.textValue.trim()))
      .map((a) => a.questionId);

    const missingRequired = requiredQuestionIds.filter(
      (qId) => !answeredQuestionIds.includes(qId)
    );
    if (missingRequired.length > 0) {
      return actionError("missing_required", { count: missingRequired.length });
    }

    // Find or create response
    let response = await prisma.surveyResponse.findFirst({
      where: { distributionId: input.distributionId, employeeId },
    });
    // Invitations create a response per person; without one we can't tell who's left
    const wasInvited = !!response;

    if (!response) {
      response = await prisma.surveyResponse.create({
        data: {
          distributionId: input.distributionId,
          employeeId,
        },
      });
    }

    if (response.isComplete) {
      return actionError("already_submitted");
    }

    const employeeForSnapshot = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        departmentId: true,
        hubId: true,
        managerId: true,
        teamMemberships: { select: { teamId: true } },
        gender: true,
        birthDate: true,
        startDate: true,
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

    // The last invited person to answer closes the survey (and sends the results emails)
    if (wasInvited) {
      const surveyId = distribution.surveyId;
      try {
        after(async () => {
          try {
            await finishIfEveryoneAnswered(surveyId, companyId);
          } catch (e) {
            console.error("Closing the survey after the last response failed:", e);
          }
        });
      } catch (e) {
        // The answers are saved; the daily job closes the survey on its end date
        console.error("Couldn't schedule the survey close check:", e);
      }
    }

    revalidatePath("/my-surveys");
    return { success: true };
  } catch (error) {
    return unexpectedActionError(error, "failed_submit_survey");
  }
}
