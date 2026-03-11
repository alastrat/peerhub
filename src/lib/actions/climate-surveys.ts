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

    revalidatePath("/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to create climate survey:", error);
    return { success: false, error: "Failed to create survey" };
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
    if (existing.status !== "DRAFT") {
      return { success: false, error: "Only draft surveys can be edited" };
    }

    // If questions are provided, delete and recreate
    if (input.questions) {
      await prisma.surveyQuestion.deleteMany({ where: { surveyId } });
    }

    const survey = await prisma.climateSurvey.update({
      where: { id: surveyId },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.type && { type: input.type }),
        ...(input.frequency && { frequency: input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"] }),
        ...(input.isAnonymous !== undefined && { isAnonymous: input.isAnonymous }),
        ...(input.questions && {
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
        }),
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to update climate survey:", error);
    return { success: false, error: "Failed to update survey" };
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

    revalidatePath("/climate");
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

    revalidatePath("/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to duplicate climate survey:", error);
    return { success: false, error: "Failed to duplicate survey" };
  }
}
