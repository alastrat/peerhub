"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { Prisma, type ClimateSurvey, type SurveyQuestion, type SurveyQuestionType } from "@prisma/client";

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

interface SurveyQuestionInput {
  text: string;
  type: SurveyQuestionType;
  dimensionId?: string;
  order: number;
  isRequired: boolean;
  config?: Record<string, unknown>;
}

interface CreateSurveyInput {
  name: string;
  description?: string;
  type: "CLIMATE" | "PULSE" | "ENPS";
  frequency?: string;
  isAnonymous?: boolean;
  questions: SurveyQuestionInput[];
  templateId?: string;
  welcomeTitle?: string;
  welcomeBody?: string;
  welcomeBannerUrl?: string;
  welcomeCtaText?: string;
  themeColor?: string;
  thankYouTitle?: string;
  thankYouBody?: string;
  thankYouCtaText?: string;
  wallpaperConfig?: Record<string, unknown> | null;
  colorConfig?: Record<string, unknown> | null;
  questionsPerPage?: number | null;
}

type SurveyWithQuestions = ClimateSurvey & {
  questions: SurveyQuestion[];
};

export async function createClimateSurvey(
  input: CreateSurveyInput
): Promise<ActionResult<SurveyWithQuestions>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    if (!input.questions || input.questions.length === 0) {
      return { success: false, error: "At least one question is required" };
    }

    const survey = await prisma.climateSurvey.create({
      data: {
        companyId,
        name,
        description: input.description?.trim() || null,
        type: input.type,
        frequency: (input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"]) || "ONCE",
        isAnonymous: input.isAnonymous ?? true,
        templateId: input.templateId || null,
        welcomeTitle: input.welcomeTitle?.trim() || null,
        welcomeBody: input.welcomeBody ?? null,
        welcomeBannerUrl: input.welcomeBannerUrl?.trim() || null,
        welcomeCtaText: input.welcomeCtaText?.trim() || null,
        themeColor: input.themeColor?.trim() || null,
        thankYouTitle: input.thankYouTitle?.trim() || null,
        thankYouBody: input.thankYouBody ?? null,
        thankYouCtaText: input.thankYouCtaText?.trim() || null,
        wallpaperConfig: input.wallpaperConfig ? (input.wallpaperConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        colorConfig: input.colorConfig ? (input.colorConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        questionsPerPage: input.questionsPerPage ?? null,
        questions: {
          create: input.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId || null,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to create climate survey:", error);
    // Surface the underlying Prisma/DB error so the UI can show what's wrong
    const msg =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `${error.code}: ${error.message.split("\n").pop() ?? error.message}`
        : error instanceof Error
          ? error.message
          : "Failed to create survey";
    return { success: false, error: msg };
  }
}

export async function updateClimateSurvey(
  surveyId: string,
  input: Partial<CreateSurveyInput>
): Promise<ActionResult<SurveyWithQuestions>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!existing) {
      return { success: false, error: "Survey not found" };
    }

    const isDraft = existing.status === "DRAFT";

    // Non-draft surveys: block structural changes (questions, name, type, frequency)
    if (!isDraft) {
      if (input.questions) {
        return { success: false, error: "Questions cannot be changed after the survey has been sent" };
      }
      // Strip structural fields — only allow presentation updates
      input = {
        welcomeTitle: input.welcomeTitle,
        welcomeBody: input.welcomeBody,
        welcomeBannerUrl: input.welcomeBannerUrl,
        welcomeCtaText: input.welcomeCtaText,
        themeColor: input.themeColor,
        thankYouTitle: input.thankYouTitle,
        thankYouBody: input.thankYouBody,
        thankYouCtaText: input.thankYouCtaText,
        wallpaperConfig: input.wallpaperConfig,
        colorConfig: input.colorConfig,
        questionsPerPage: input.questionsPerPage,
      };
    }

    // Reject empty questions array
    if (input.questions && input.questions.length === 0) {
      return { success: false, error: "At least one question is required" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...(input.name && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.type && { type: input.type }),
      ...(input.frequency && { frequency: input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"] }),
      ...(input.isAnonymous !== undefined && { isAnonymous: input.isAnonymous }),
      ...(input.templateId !== undefined && { templateId: input.templateId || null }),
      ...(input.welcomeTitle !== undefined && { welcomeTitle: input.welcomeTitle?.trim() || null }),
      ...(input.welcomeBody !== undefined && { welcomeBody: input.welcomeBody || null }),
      ...(input.welcomeBannerUrl !== undefined && { welcomeBannerUrl: input.welcomeBannerUrl?.trim() || null }),
      ...(input.welcomeCtaText !== undefined && { welcomeCtaText: input.welcomeCtaText?.trim() || null }),
      ...(input.themeColor !== undefined && { themeColor: input.themeColor?.trim() || null }),
      ...(input.thankYouTitle !== undefined && { thankYouTitle: input.thankYouTitle?.trim() || null }),
      ...(input.thankYouBody !== undefined && { thankYouBody: input.thankYouBody || null }),
      ...(input.thankYouCtaText !== undefined && { thankYouCtaText: input.thankYouCtaText?.trim() || null }),
      ...(input.wallpaperConfig !== undefined && {
        wallpaperConfig: input.wallpaperConfig ? (input.wallpaperConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
      }),
      ...(input.colorConfig !== undefined && {
        colorConfig: input.colorConfig ? (input.colorConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
      }),
      ...(input.questionsPerPage !== undefined && {
        questionsPerPage: input.questionsPerPage ?? null,
      }),
    };

    // If questions are provided, delete and recreate atomically in a transaction
    if (input.questions) {
      const survey = await prisma.$transaction(async (tx) => {
        await tx.surveyQuestion.deleteMany({ where: { surveyId } });
        return tx.climateSurvey.update({
          where: { id: surveyId },
          data: {
            ...updateData,
            questions: {
              create: input.questions!.map((q) => ({
                text: q.text,
                type: q.type,
                dimensionId: q.dimensionId || null,
                order: q.order,
                isRequired: q.isRequired,
                config: q.config as Prisma.InputJsonValue | undefined,
              })),
            },
          },
          include: { questions: { orderBy: { order: "asc" } } },
        });
      });

      revalidatePath("/surveys/climate");
      return { success: true, data: survey };
    }

    const survey = await prisma.climateSurvey.update({
      where: { id: surveyId },
      data: updateData,
      include: { questions: { orderBy: { order: "asc" } } },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to update climate survey:", error);
    const msg =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `${error.code}: ${error.message.split("\n").pop() ?? error.message}`
        : error instanceof Error
          ? error.message
          : "Failed to update survey";
    return { success: false, error: msg };
  }
}

export async function deleteClimateSurvey(surveyId: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      include: { _count: { select: { distributions: true } } },
    });
    if (!existing) {
      return { success: false, error: "Survey not found" };
    }

    if (existing._count.distributions > 0) {
      // Archive instead of delete if it has distributions
      await prisma.climateSurvey.update({
        where: { id: surveyId },
        data: { status: "ARCHIVED" },
      });
    } else {
      await prisma.climateSurvey.delete({ where: { id: surveyId } });
    }

    revalidatePath("/surveys/climate");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete climate survey:", error);
    return { success: false, error: "Failed to delete survey" };
  }
}

export async function duplicateClimateSurvey(
  surveyId: string
): Promise<ActionResult<SurveyWithQuestions>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const original = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });
    if (!original) {
      return { success: false, error: "Survey not found" };
    }

    const survey = await prisma.climateSurvey.create({
      data: {
        companyId,
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        frequency: original.frequency,
        isAnonymous: original.isAnonymous,
        // Copy all customization fields
        templateId: original.templateId,
        welcomeTitle: original.welcomeTitle,
        welcomeBody: original.welcomeBody,
        welcomeBannerUrl: original.welcomeBannerUrl,
        welcomeCtaText: original.welcomeCtaText,
        themeColor: original.themeColor,
        wallpaperConfig: original.wallpaperConfig ?? Prisma.JsonNull,
        colorConfig: original.colorConfig ?? Prisma.JsonNull,
        thankYouTitle: original.thankYouTitle,
        thankYouBody: original.thankYouBody,
        thankYouCtaText: original.thankYouCtaText,
        questionsPerPage: original.questionsPerPage,
        questions: {
          create: original.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to duplicate climate survey:", error);
    return { success: false, error: "Failed to duplicate survey" };
  }
}

/**
 * Update survey settings. All fields are editable regardless of status.
 */
export interface SurveySettingsInput {
  name?: string;
  description?: string;
  type?: "CLIMATE" | "PULSE" | "ENPS";
  frequency?: string;
  isAnonymous?: boolean;
  questionsPerPage?: number | null;
  logoUrl?: string | null;
  accessStartDate?: Date | string | null;
  accessEndDate?: Date | string | null;
}

export async function updateSurveySettings(
  surveyId: string,
  input: SurveySettingsInput
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!existing) {
      return { success: false, error: "Survey not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return { success: false, error: "Name is required" };
      data.name = name;
    }
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.type !== undefined) data.type = input.type;
    if (input.frequency !== undefined)
      data.frequency = input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"];
    if (input.isAnonymous !== undefined) data.isAnonymous = input.isAnonymous;
    if (input.questionsPerPage !== undefined) data.questionsPerPage = input.questionsPerPage;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl?.trim() || null;
    if (input.accessStartDate !== undefined)
      data.accessStartDate = input.accessStartDate ? new Date(input.accessStartDate) : null;
    if (input.accessEndDate !== undefined)
      data.accessEndDate = input.accessEndDate ? new Date(input.accessEndDate) : null;

    if (Object.keys(data).length === 0) {
      return { success: true };
    }

    await prisma.climateSurvey.update({
      where: { id: surveyId },
      data,
    });

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update survey settings:", error);
    const msg =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `${error.code}: ${error.message.split("\n").pop() ?? error.message}`
        : error instanceof Error
          ? error.message
          : "Failed to update settings";
    return { success: false, error: msg };
  }
}

interface UpdateQuestionInput {
  text: string;
  type?: SurveyQuestionType;
  dimensionId?: string | null;
  isRequired?: boolean;
}

/**
 * Update a single question on an existing survey. Used by the inline-edit
 * pencil on the survey detail page so admins can fix typos or refine wording
 * after a survey is already in the wild.
 *
 * Rules:
 * - DRAFT surveys → all fields editable (text, type, dimensionId, isRequired)
 * - ACTIVE / CLOSED → only `text` is editable; structural changes (type,
 *   dimension, required) would invalidate already-collected responses, so we
 *   silently drop them with an error rather than risk corruption.
 * - ARCHIVED → no edits at all.
 */
export async function updateClimateSurveyQuestion(
  surveyId: string,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      select: { id: true, status: true },
    });
    if (!survey) {
      return { success: false, error: "Survey not found" };
    }

    if (survey.status === "ARCHIVED") {
      return { success: false, error: "Archived surveys cannot be edited" };
    }

    const question = await prisma.surveyQuestion.findFirst({
      where: { id: questionId, surveyId },
      select: { id: true },
    });
    if (!question) {
      return { success: false, error: "Question not found" };
    }

    const trimmedText = input.text?.trim();
    if (!trimmedText) {
      return { success: false, error: "Question text is required" };
    }

    const isDraft = survey.status === "DRAFT";

    // Build the update payload. Non-draft is text-only — the caller's
    // structural fields are intentionally ignored, not rejected, so the UI
    // can disable those inputs without forcing the client to filter the
    // payload before submitting.
    const data: Prisma.SurveyQuestionUpdateInput = {
      text: trimmedText,
    };

    if (isDraft) {
      if (input.type !== undefined) data.type = input.type;
      if (input.isRequired !== undefined) data.isRequired = input.isRequired;
      if (input.dimensionId !== undefined) {
        data.dimension = input.dimensionId
          ? { connect: { id: input.dimensionId } }
          : { disconnect: true };
      }
    }

    await prisma.surveyQuestion.update({
      where: { id: questionId },
      data,
    });

    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to update question";
    return { success: false, error: msg };
  }
}
