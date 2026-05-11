"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { ClimateSurveyTemplate, Prisma } from "@prisma/client";

async function requireCompanyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin || !session.companyUser?.companyId) {
    throw new Error("Unauthorized");
  }
  return { session, companyId: session.companyUser.companyId };
}

interface TemplateQuestionInput {
  text: string;
  type: "LIKERT" | "TEXT" | "NPS" | "RATING";
  dimensionId?: string;
  order: number;
  isRequired: boolean;
  config?: Prisma.InputJsonValue;
}

interface CreateTemplateInput {
  name: string;
  description?: string;
  type: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE";
  questions: TemplateQuestionInput[];
}

export async function createClimateSurveyTemplate(
  input: CreateTemplateInput
): Promise<ActionResult<ClimateSurveyTemplate>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    if (!input.name.trim()) {
      return { success: false, error: "Template name is required" };
    }
    if (input.questions.length === 0) {
      return { success: false, error: "At least one question is required" };
    }

    const template = await prisma.climateSurveyTemplate.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        companyId,
        type: input.type,
        questions: {
          create: input.questions.map((q) => ({
            text: q.text.trim(),
            type: q.type,
            dimensionId: q.dimensionId || null,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config || undefined,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    revalidatePath("/surveys/climate/templates");
    return { success: true, data: template };
  } catch (error) {
    console.error("Failed to create climate survey template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

export async function updateClimateSurveyTemplate(
  templateId: string,
  input: Partial<CreateTemplateInput>
): Promise<ActionResult<ClimateSurveyTemplate>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurveyTemplate.findFirst({
      where: { id: templateId, companyId },
    });
    if (!existing) {
      return { success: false, error: "Template not found" };
    }

    const template = await prisma.$transaction(async (tx) => {
      if (input.questions) {
        await tx.climateSurveyTemplateQuestion.deleteMany({
          where: { templateId },
        });
      }

      return tx.climateSurveyTemplate.update({
        where: { id: templateId },
        data: {
          ...(input.name && { name: input.name.trim() }),
          ...(input.description !== undefined && {
            description: input.description?.trim() || null,
          }),
          ...(input.type && { type: input.type }),
          ...(input.questions && {
            questions: {
              create: input.questions.map((q) => ({
                text: q.text.trim(),
                type: q.type,
                dimensionId: q.dimensionId || null,
                order: q.order,
                isRequired: q.isRequired,
                config: q.config || undefined,
              })),
            },
          }),
        },
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      });
    });

    revalidatePath("/surveys/climate/templates");
    revalidatePath(`/surveys/climate/templates/${templateId}`);
    return { success: true, data: template };
  } catch (error) {
    console.error("Failed to update climate survey template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteClimateSurveyTemplate(
  templateId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const template = await prisma.climateSurveyTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { _count: { select: { surveys: true } } },
    });
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template._count.surveys > 0) {
      await prisma.climateSurveyTemplate.update({
        where: { id: templateId },
        data: { isArchived: true },
      });
    } else {
      await prisma.climateSurveyTemplate.delete({
        where: { id: templateId },
      });
    }

    revalidatePath("/surveys/climate/templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete climate survey template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function duplicateClimateSurveyTemplate(
  templateId: string
): Promise<ActionResult<ClimateSurveyTemplate>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const original = await prisma.climateSurveyTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!original) {
      return { success: false, error: "Template not found" };
    }

    const copy = await prisma.climateSurveyTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        companyId,
        type: original.type,
        questions: {
          create: original.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config || undefined,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    revalidatePath("/surveys/climate/templates");
    return { success: true, data: copy };
  } catch (error) {
    console.error("Failed to duplicate climate survey template:", error);
    return { success: false, error: "Failed to duplicate template" };
  }
}

export async function createSurveyFromTemplate(
  templateId: string,
  overrides?: { name?: string; frequency?: string; isAnonymous?: boolean }
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const template = await prisma.climateSurveyTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const survey = await prisma.climateSurvey.create({
      data: {
        name: overrides?.name || template.name,
        description: template.description,
        companyId,
        templateId: template.id,
        type: template.type,
        frequency: (overrides?.frequency as never) || "ONCE",
        isAnonymous: overrides?.isAnonymous ?? true,
        questions: {
          create: template.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config || undefined,
          })),
        },
      },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: { id: survey.id } };
  } catch (error) {
    console.error("Failed to create survey from template:", error);
    return { success: false, error: "Failed to create survey" };
  }
}
