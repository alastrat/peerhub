"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { Prisma, type Template, type TemplateSection, type TemplateQuestion, type ReviewerType, type QuestionType } from "@prisma/client";

interface CreateTemplateInput {
  name: string;
  description?: string;
  sections: {
    title: string;
    description?: string;
    order: number;
    reviewerTypes: ReviewerType[];
    questions: {
      text: string;
      description?: string;
      type: QuestionType;
      isRequired: boolean;
      order: number;
      config?: Record<string, unknown>;
    }[];
  }[];
}

type TemplateWithSections = Template & {
  sections: (TemplateSection & {
    questions: TemplateQuestion[];
  })[];
};

export async function createTemplate(
  input: CreateTemplateInput
): Promise<ActionResult<TemplateWithSections>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    const template = await prisma.template.create({
      data: {
        name: input.name,
        description: input.description,
        companyId,
        sections: {
          create: input.sections.map((section) => ({
            title: section.title,
            description: section.description,
            order: section.order,
            reviewerTypes: section.reviewerTypes,
            questions: {
              create: section.questions.map((question) => ({
                text: question.text,
                description: question.description,
                type: question.type,
                isRequired: question.isRequired,
                order: question.order,
                config: question.config as Prisma.InputJsonValue | undefined,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            questions: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/templates");
    return { success: true, data: template };
  } catch (error) {
    console.error("Failed to create template:", error);
    return { success: false, error: "Failed to create template" };
  }
}

export async function updateTemplate(
  templateId: string,
  input: Partial<CreateTemplateInput>
): Promise<ActionResult<TemplateWithSections>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify template belongs to company
    const existing = await prisma.template.findFirst({
      where: { id: templateId, companyId },
    });

    if (!existing) {
      return { success: false, error: "Template not found" };
    }

    // If sections are provided, delete and recreate
    if (input.sections) {
      await prisma.templateSection.deleteMany({
        where: { templateId },
      });
    }

    const template = await prisma.template.update({
      where: { id: templateId },
      data: {
        name: input.name,
        description: input.description,
        ...(input.sections && {
          sections: {
            create: input.sections.map((section) => ({
              title: section.title,
              description: section.description,
              order: section.order,
              reviewerTypes: section.reviewerTypes,
              questions: {
                create: section.questions.map((question) => ({
                  text: question.text,
                  description: question.description,
                  type: question.type,
                  isRequired: question.isRequired,
                  order: question.order,
                  config: question.config as Prisma.InputJsonValue | undefined,
                })),
              },
            })),
          },
        }),
      },
      include: {
        sections: {
          include: {
            questions: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/templates");
    return { success: true, data: template };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify template belongs to company
    const existing = await prisma.template.findFirst({
      where: { id: templateId, companyId },
    });

    if (!existing) {
      return { success: false, error: "Template not found" };
    }

    // Check if template is used by any cycles
    const cyclesUsingTemplate = await prisma.cycle.count({
      where: { templateId },
    });

    if (cyclesUsingTemplate > 0) {
      // Archive instead of delete
      await prisma.template.update({
        where: { id: templateId },
        data: { isArchived: true },
      });
    } else {
      await prisma.template.delete({
        where: { id: templateId },
      });
    }

    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function duplicateTemplate(
  templateId: string
): Promise<ActionResult<TemplateWithSections>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Get the template to duplicate
    const original = await prisma.template.findFirst({
      where: { id: templateId, companyId },
      include: {
        sections: {
          include: {
            questions: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!original) {
      return { success: false, error: "Template not found" };
    }

    // Create duplicate
    const template = await prisma.template.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        companyId,
        sections: {
          create: original.sections.map((section) => ({
            title: section.title,
            description: section.description,
            order: section.order,
            reviewerTypes: section.reviewerTypes,
            questions: {
              create: section.questions.map((question) => ({
                text: question.text,
                description: question.description,
                type: question.type,
                isRequired: question.isRequired,
                order: question.order,
                config: question.config as Prisma.InputJsonValue | undefined,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            questions: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/templates");
    return { success: true, data: template };
  } catch (error) {
    console.error("Failed to duplicate template:", error);
    return { success: false, error: "Failed to duplicate template" };
  }
}
